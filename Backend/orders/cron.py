# from django_cron import CronJobBase, Schedule

# class AccrueDailyInterest(CronJobBase):
#     RUN_EVERY_MINS = 1440  # 24 hours
#     schedule = Schedule(run_every_mins=RUN_EVERY_MINS)
#     code = 'orders.accrue_daily_interest'
    
#     def do(self):
#         from django.core.management import call_command
#         call_command('accrue_daily_interest')


#python manage.py runcrons
