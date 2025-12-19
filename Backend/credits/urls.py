from django.urls import path
from . import views

app_name = 'credits'

urlpatterns = [
    # User Credit Views (removed "my-" prefix)
    path('account/', views.my_credit_account, name='my_credit_account'),
    path('transactions/', views.my_credit_transactions, name='my_credit_transactions'),
    path('repayments/', views.my_repayment_history, name='my_repayment_history'),
    
    # Management (was admin) - Credit Administration
    path('accounts/', views.all_credit_accounts, name='all_credit_accounts'),
    path('accounts/<int:user_id>/', views.credit_account_detail, name='credit_account_detail'),
    path('accounts/<int:user_id>/repayment/', views.process_repayment, name='process_repayment'),
    path('accounts/<int:user_id>/increase-limit/', views.increase_credit_limit, name='increase_credit_limit'),
    path('repayments/all/', views.all_repayment_history, name='all_repayment_history'),
    path('limit-history/', views.all_credit_limit_history, name='all_credit_limit_history'),
]