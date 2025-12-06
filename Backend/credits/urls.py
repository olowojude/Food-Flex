from django.urls import path
from . import views

app_name = 'credits'

urlpatterns = [
    # Buyer Credit Views
    path('my-credit/', views.my_credit_account, name='my_credit_account'),
    path('my-transactions/', views.my_credit_transactions, name='my_credit_transactions'),
    path('my-repayments/', views.my_repayment_history, name='my_repayment_history'),
    
    # Admin Credit Management
    path('admin/accounts/', views.all_credit_accounts, name='all_credit_accounts'),
    path('admin/accounts/<int:user_id>/', views.credit_account_detail, name='credit_account_detail'),
    path('admin/repayment/<int:user_id>/', views.process_repayment, name='process_repayment'),
    path('admin/increase-limit/<int:user_id>/', views.increase_credit_limit, name='increase_credit_limit'),
    path('admin/repayments/', views.all_repayment_history, name='all_repayment_history'),
    path('admin/limit-history/', views.all_credit_limit_history, name='all_credit_limit_history'),
]