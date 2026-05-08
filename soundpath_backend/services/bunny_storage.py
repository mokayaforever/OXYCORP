"""
Bunny.net CDN & Storage Integration for Django
Handles file uploads, downloads, and media management
"""

import os
import requests
from datetime import datetime
from typing import Dict, Optional, List
import mimetypes
from io import BytesIO


class BunnyStorageClient:
    """
    Client for interacting with Bunny.net storage and CDN
    """
    
    def __init__(self):
        self.api_key = os.getenv('BUNNY_STORAGE_API_KEY')
        self.storage_zone = os.getenv('BUNNY_STORAGE_ZONE')
        self.hostname = os.getenv('BUNNY_STORAGE_HOSTNAME', 'storage.bunnycdn.com')
        self.region = os.getenv('BUNNY_STORAGE_REGION', 'us')
        self.cdn_url = os.getenv('BUNNY_CDN_URL', 'https://oxycorp.b-cdn.net/')
        
        if not self.api_key or not self.storage_zone:
            raise ValueError('BUNNY_STORAGE_API_KEY and BUNNY_STORAGE_ZONE must be set')
        
        self.base_url = f'https://{self.region}.{self.hostname}/{self.storage_zone}'
        self.headers = {
            'AccessKey': self.api_key,
            'User-Agent': 'SoundPath/1.0',
        }

    def upload_file(self, file_path: str, remote_path: str) -> Dict:
        """
        Upload a file to Bunny storage
        
        Args:
            file_path: Local file path or file content
            remote_path: Remote storage path (e.g., 'music/tracks/')
            
        Returns:
            Dict with upload result and CDN URL
        """
        try:
            # Read file
            if isinstance(file_path, str) and os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    file_content = f.read()
                file_name = os.path.basename(file_path)
            else:
                file_content = file_path
                file_name = None
            
            if not file_name:
                raise ValueError('file_name is required')
            
            # Prepare upload URL
            upload_url = f'{self.base_url}/{remote_path.strip("/")}/{file_name}'
            
            # Get MIME type
            content_type, _ = mimetypes.guess_type(file_name)
            if not content_type:
                content_type = 'application/octet-stream'
            
            headers = self.headers.copy()
            headers['Content-Type'] = content_type
            
            # Upload
            response = requests.put(upload_url, data=file_content, headers=headers, timeout=30)
            response.raise_for_status()
            
            cdn_url = f'{self.cdn_url.rstrip("/")}/{remote_path.strip("/")}/{file_name}'
            
            return {
                'success': True,
                'file_name': file_name,
                'remote_path': f'{remote_path}/{file_name}',
                'cdn_url': cdn_url,
                'timestamp': datetime.utcnow().isoformat(),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'file_name': file_name if 'file_name' in locals() else None,
            }

    def download_file(self, remote_path: str, save_path: Optional[str] = None) -> Dict:
        """
        Download a file from Bunny storage
        
        Args:
            remote_path: Remote file path
            save_path: Optional local path to save
            
        Returns:
            Dict with download result
        """
        try:
            download_url = f'{self.base_url}/{remote_path.strip("/")}'
            
            response = requests.get(download_url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            if save_path:
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                with open(save_path, 'wb') as f:
                    f.write(response.content)
            
            return {
                'success': True,
                'remote_path': remote_path,
                'save_path': save_path,
                'size_bytes': len(response.content),
                'timestamp': datetime.utcnow().isoformat(),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'remote_path': remote_path,
            }

    def list_files(self, path: str = '') -> List[Dict]:
        """
        List files in Bunny storage
        
        Args:
            path: Storage path to list
            
        Returns:
            List of files in the path
        """
        try:
            list_url = f'{self.base_url}/{path.strip("/") or ""}'
            response = requests.get(list_url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            return response.json() or []
            
        except Exception as e:
            print(f'Error listing files: {e}')
            return []

    def delete_file(self, remote_path: str) -> Dict:
        """
        Delete a file from Bunny storage
        
        Args:
            remote_path: Remote file path to delete
            
        Returns:
            Dict with delete result
        """
        try:
            delete_url = f'{self.base_url}/{remote_path.strip("/")}'
            
            response = requests.delete(delete_url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            return {
                'success': True,
                'remote_path': remote_path,
                'timestamp': datetime.utcnow().isoformat(),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'remote_path': remote_path,
            }

    def get_cdn_url(self, remote_path: str) -> str:
        """
        Generate CDN URL for a file
        
        Args:
            remote_path: Remote file path
            
        Returns:
            Full CDN URL
        """
        return f'{self.cdn_url.rstrip("/")}/{remote_path.lstrip("/")}'

    def batch_upload(self, files: List[tuple]) -> List[Dict]:
        """
        Upload multiple files
        
        Args:
            files: List of (local_path, remote_path) tuples
            
        Returns:
            List of upload results
        """
        results = []
        for local_path, remote_path in files:
            result = self.upload_file(local_path, remote_path)
            results.append(result)
        return results


# Instantiate client
bunny_storage = BunnyStorageClient()
