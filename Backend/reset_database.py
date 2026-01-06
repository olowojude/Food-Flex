import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'foodflex.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("DROP SCHEMA public CASCADE;")
    cursor.execute("CREATE SCHEMA public;")
    cursor.execute("GRANT ALL ON SCHEMA public TO postgres;")
    cursor.execute("GRANT ALL ON SCHEMA public TO public;")
    
print("✅ Database cleared successfully!")