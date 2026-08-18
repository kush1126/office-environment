import uuid
import re
from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.models.user import User
from app.models.ai import ChatMessage
from app.models import Invoice
from app.models import Product, Inventory
from app.schemas.ai import ChatRequest

class AIService:
    async def get_history(self, db: AsyncSession, company_id: uuid.UUID, user_id: uuid.UUID) -> Sequence[ChatMessage]:
        query = select(ChatMessage).where(
            ChatMessage.company_id == company_id,
            ChatMessage.user_id == user_id
        ).order_by(ChatMessage.created_at.asc())
        
        result = await db.execute(query)
        return result.scalars().all()

    async def process_chat(self, db: AsyncSession, company_id: uuid.UUID, current_user: User, request: ChatRequest) -> ChatMessage:
        # 1. Save user message
        user_msg = ChatMessage(
            company_id=company_id,
            user_id=current_user.id,
            role="user",
            content=request.message
        )
        db.add(user_msg)
        await db.flush()

        # 2. Determine Intent & Fetch Data (MVP Rule-Based Engine)
        query_text = request.message.lower()
        response_text = "I'm sorry, I couldn't understand that. I can currently help you with questions about your **Revenue**, **Pending Invoices**, or **Low Stock Alerts**."

        try:
            if re.search(r"revenue|sales|earned", query_text):
                # Calculate total revenue
                sales_query = select(func.sum(Invoice.grand_total)).where(
                    Invoice.company_id == company_id,
                    Invoice.status.in_(["PAID", "PARTIAL", "ISSUED"]),
                    Invoice.deleted_at.is_(None)
                )
                result = await db.execute(sales_query)
                total = result.scalar() or 0
                response_text = f"Your total recorded revenue is **₹{total:,.2f}**."

            elif re.search(r"pending|unpaid|due", query_text) and re.search(r"invoice|bill|receivable", query_text):
                # Count pending invoices
                pending_query = select(func.count(), func.sum(Invoice.grand_total - Invoice.amount_paid)).where(
                    Invoice.company_id == company_id,
                    Invoice.status.in_(["ISSUED", "PARTIAL"]),
                    Invoice.deleted_at.is_(None)
                )
                result = await db.execute(pending_query)
                count, amount = result.first()
                if count and count > 0:
                    response_text = f"You have **{count}** pending invoices totaling **₹{amount:,.2f}**."
                else:
                    response_text = "Great news! You have no pending invoices."

            elif re.search(r"stock|inventory|low|empty", query_text):
                # Find low stock
                alerts_query = select(Product.name, func.sum(Inventory.quantity).label("total_qty")).outerjoin(
                    Inventory, Product.id == Inventory.product_id
                ).where(
                    Product.company_id == company_id,
                    Product.deleted_at.is_(None)
                ).group_by(Product.id).having(
                    func.sum(Inventory.quantity) <= Product.reorder_point
                )
                result = await db.execute(alerts_query)
                alerts = result.all()
                
                if not alerts:
                    response_text = "Your inventory looks healthy. No products are currently below their reorder points."
                else:
                    items = "\n".join([f"- **{name}** (Current Stock: {qty or 0})" for name, qty in alerts])
                    response_text = f"The following products are running low on stock:\n{items}"
                    
            elif re.search(r"hello|hi|hey", query_text):
                response_text = f"Hello {current_user.full_name}! I am your Business OS Assistant. You can ask me about your sales, pending invoices, or inventory status."
        
        except Exception as e:
            response_text = "I encountered an error while trying to fetch that data. Please try again later."

        # 3. Save assistant message
        ai_msg = ChatMessage(
            company_id=company_id,
            user_id=current_user.id,
            role="assistant",
            content=response_text
        )
        db.add(ai_msg)
        await db.commit()
        
        return ai_msg
