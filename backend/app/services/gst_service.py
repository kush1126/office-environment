import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import Invoice
from app.models import Bill
from app.models import Customer
from app.models import Vendor
from app.schemas.finance import GSTReportResponse, GSTReportEntry
from decimal import Decimal

class GSTService:
    async def generate_report(
        self, db: AsyncSession, company_id: uuid.UUID, start_date: date, end_date: date
    ) -> GSTReportResponse:
        
        # 1. Fetch Invoices (Sales) for Output Tax
        invoices_query = select(Invoice, Customer.name, Customer.gstin).join(
            Customer, Invoice.customer_id == Customer.id
        ).where(
            Invoice.company_id == company_id,
            Invoice.issue_date >= start_date,
            Invoice.issue_date <= end_date,
            Invoice.deleted_at.is_(None)
        )
        invoices_result = await db.execute(invoices_query)
        invoices_data = invoices_result.all()

        # 2. Fetch Bills (Purchases) for Input Tax
        bills_query = select(Bill, Vendor.name, Vendor.gstin).join(
            Vendor, Bill.vendor_id == Vendor.id
        ).where(
            Bill.company_id == company_id,
            Bill.issue_date >= start_date,
            Bill.issue_date <= end_date,
            Bill.deleted_at.is_(None)
        )
        bills_result = await db.execute(bills_query)
        bills_data = bills_result.all()

        entries = []
        total_sales = Decimal(0)
        total_sales_tax = Decimal(0)
        total_purchases = Decimal(0)
        total_purchases_tax = Decimal(0)

        # Process Invoices
        for invoice, cust_name, cust_gstin in invoices_data:
            total_sales += Decimal(str(invoice.subtotal))
            total_sales_tax += Decimal(str(invoice.tax_total))
            
            entries.append(
                GSTReportEntry(
                    document_type="INVOICE",
                    document_number=invoice.invoice_number,
                    date=invoice.issue_date,
                    party_name=cust_name,
                    party_gstin=cust_gstin,
                    subtotal=Decimal(str(invoice.subtotal)),
                    tax_total=Decimal(str(invoice.tax_total)),
                    grand_total=Decimal(str(invoice.grand_total))
                )
            )

        # Process Bills
        for bill, vend_name, vend_gstin in bills_data:
            total_purchases += Decimal(str(bill.subtotal))
            total_purchases_tax += Decimal(str(bill.tax_total))
            
            entries.append(
                GSTReportEntry(
                    document_type="BILL",
                    document_number=bill.bill_number,
                    date=bill.issue_date,
                    party_name=vend_name,
                    party_gstin=vend_gstin,
                    subtotal=Decimal(str(bill.subtotal)),
                    tax_total=Decimal(str(bill.tax_total)),
                    grand_total=Decimal(str(bill.grand_total))
                )
            )

        # Sort entries by date
        entries.sort(key=lambda x: x.date)

        net_tax_payable = total_sales_tax - total_purchases_tax

        return GSTReportResponse(
            company_id=company_id,
            period_start=start_date,
            period_end=end_date,
            total_sales=total_sales,
            total_sales_tax=total_sales_tax,
            total_purchases=total_purchases,
            total_purchases_tax=total_purchases_tax,
            net_tax_payable=net_tax_payable,
            entries=entries
        )
