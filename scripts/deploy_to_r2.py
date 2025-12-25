import boto3
import os
import sys
import mimetypes
from botocore.exceptions import ClientError, NoCredentialsError

# ---------------------------------------------------------------------------
# CONFIGURATION & ENVIRONMENT VALIDATION
# ---------------------------------------------------------------------------
# We retrieve configuration from Environment Variables.
# This pattern creates a Twelve-Factor App compliant script.
# ---------------------------------------------------------------------------

ACCOUNT_ID = os.environ.get('R2_ACCOUNT_ID')
ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID')
SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY')
BUCKET_NAME = os.environ.get('R2_BUCKET_NAME')

# Fail fast if environment is not configured
if not all():
    print("CRITICAL ERROR: Missing one or more required environment variables.")
    print(f"Status: AccountID={'OK' if ACCOUNT_ID else 'MISSING'}, "
          f"KeyID={'OK' if ACCESS_KEY_ID else 'MISSING'}, "
          f"Secret={'OK' if SECRET_ACCESS_KEY else 'MISSING'}, "
          f"Bucket={'OK' if BUCKET_NAME else 'MISSING'}")
    sys.exit(1)

def get_r2_client():
    """
    Initializes the boto3 client with Cloudflare R2 specific connection parameters.
    Reference: 
    """
    endpoint = f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com"
    
    try:
        client = boto3.client(
            service_name='s3',
            endpoint_url=endpoint,
            aws_access_key_id=ACCESS_KEY_ID,
            aws_secret_access_key=SECRET_ACCESS_KEY,
            region_name='auto'  # 'auto' is the required region string for R2 SDK compatibility
        )
        return client
    except Exception as e:
        print(f"Failed to initialize Boto3 client: {e}")
        sys.exit(1)

def upload_file(file_path, object_name=None):
    """
    Uploads a single file to R2 using upload_fileobj for streaming efficiency.
    Handles MIME type guessing to ensure correct browser rendering.
    """
    if object_name is None:
        object_name = os.path.basename(file_path)

    client = get_r2_client()
    
    # Guess the content type (MIME) based on extension
    content_type, _ = mimetypes.guess_type(file_path)
    if content_type is None:
        content_type = 'application/octet-stream' # Default binary fallback

    extra_args = {
        'ContentType': content_type
    }

    print(f"Starting upload: {file_path} -> r2://{BUCKET_NAME}/{object_name} ({content_type})")

    try:
        with open(file_path, 'rb') as f:
            client.upload_fileobj(
                f, 
                BUCKET_NAME, 
                object_name, 
                ExtraArgs=extra_args
            )
        print(f"SUCCESS: Uploaded {object_name}")
        return True

    except ClientError as e:
        # Detailed handling of AWS/R2 specific errors
        error_code = e.response['Error']['Code']
        if error_code == '403':
            print("ERROR 403: Access Denied. Check your API Token Permissions (Admin vs Object).")
            # Reference 
        elif error_code == '404':
            print("ERROR 404: Bucket not found. Check the BUCKET_NAME variable.")
        elif error_code == 'InvalidAccessKeyId':
            print("ERROR 401: Invalid Credentials. Check Account ID or Key ID.")
            # Reference 
        else:
            print(f"ERROR: Cloudflare R2 returned an error: {error_code} - {e}")
        return False

    except FileNotFoundError:
        print(f"ERROR: Local file not found: {file_path}")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected exception: {e}")
        return False

if __name__ == "__main__":
    # For Phase 1, we accept the file to upload as a command line argument
    if len(sys.argv) < 2:
        print("Usage: python deploy_to_r2.py <path_to_file>")
        sys.exit(1)
        
    target_file = sys.argv[1]
    success = upload_file(target_file)
    
    if not success:
        sys.exit(1) # Exit with non-zero code to fail the GitHub Action