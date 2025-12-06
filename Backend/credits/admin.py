from django.contrib import admin
from credits.models import CreditAccount, RepaymentHistory, CreditLimitHistory, CreditTransaction

# Register your models here.

admin.site.register(CreditAccount)
admin.site.register(RepaymentHistory)
admin.site.register(CreditLimitHistory)
admin.site.register(CreditTransaction)
