import os
import subprocess
import requests
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Celery 설정
celery = Celery("ffmpeg_tasks")
celery.conf.broker_url = os.getenv("REDIS_URL")
celery.conf.result_backend = os.getenv("CELERY_RESULT_BACKEND")

# Slack Webhook URL
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

@celery.task(bind=True)
def convert_audio_task(self, input_file):
    try:
        print(f"Processing audio file: {input_file}")
        
        # 파일 존재 여부 확인
        if not os.path.exists(input_file):
            return {"status": "error", "message": "Input file not found"}
        
        # 출력 폴더 생성
        output_folder = "outputs"
        os.makedirs(output_folder, exist_ok=True)
        
        # 파일명에서 확장자 제거하고 출력 파일명 생성
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        output_files = []
        
        # 임시로 단순 복사 (실제로는 FFmpeg로 변환 및 분할)
        # TODO: FFmpeg를 사용한 실제 오디오 처리 로직 구현 필요
        output_file = os.path.join(output_folder, f"{base_name}_converted.mp3")
        
        # 간단한 파일 복사로 테스트 (실제로는 FFmpeg 처리)
        try:
            import shutil
            shutil.copy2(input_file, output_file)
            output_files.append(output_file)
            print(f"File copied to: {output_file}")
        except Exception as e:
            print(f"File processing error: {e}")
            return {"status": "error", "message": f"File processing failed: {e}"}
        
        # Slack 알림 보내기
        if SLACK_WEBHOOK_URL and output_files:
            send_slack_notification(len(output_files), output_files)
        
        return {
            "status": "completed",
            "output_files": output_files,
            "file_count": len(output_files)
        }
        
    except Exception as e:
        print(f"Error in convert_audio_task: {e}")
        return {"status": "error", "message": str(e)}

def send_slack_notification(file_count, output_files):
    """Slack으로 변환 완료 알림 보내기"""
    try:
        if not SLACK_WEBHOOK_URL:
            print("Slack webhook URL not configured")
            return
        
        # 다운로드 링크 생성 (실제 서버 URL 필요)
        base_url = os.getenv("BASE_URL", "http://localhost:5000")
        download_links = []
        for file_path in output_files:
            filename = os.path.basename(file_path)
            download_url = f"{base_url}/download/{filename}"
            download_links.append(download_url)
        
        # Slack 메시지 구성
        message_text = f"오디오 변환완료!\n\n변환된 파일수: {file_count:02d}개\n다운로드링크: {' '.join(download_links)}"
        
        payload = {"text": message_text}
        
        response = requests.post(SLACK_WEBHOOK_URL, json=payload, timeout=10)
        if response.status_code == 200:
            print("Slack notification sent successfully")
        else:
            print(f"Failed to send Slack notification: {response.status_code}")
            
    except Exception as e:
        print(f"Error sending Slack notification: {e}")

if __name__ == "__main__":
    # Celery worker 실행을 위한 설정
    celery.start()