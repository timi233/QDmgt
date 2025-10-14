import os
os.environ['SECURITY_ALLOWED_ORIGINS'] = '["http://localhost:3002","http://localhost:3000"]'

from src.config.settings import SecurityConfig, Settings

print("=" * 70)
print("Testing ALLOWED_ORIGINS parsing")
print("=" * 70)

# Test SecurityConfig directly
print("\n1. SecurityConfig:")
sec_config = SecurityConfig()
print(f"   ALLOWED_ORIGINS: {sec_config.ALLOWED_ORIGINS}")
print(f"   Type: {type(sec_config.ALLOWED_ORIGINS)}")

# Test Settings
print("\n2. Settings:")
settings = Settings()
print(f"   ALLOWED_ORIGINS: {settings.ALLOWED_ORIGINS}")
print(f"   Type: {type(settings.ALLOWED_ORIGINS)}")

print("\n3. Environment variable:")
print(f"   SECURITY_ALLOWED_ORIGINS = {os.environ.get('SECURITY_ALLOWED_ORIGINS')}")
