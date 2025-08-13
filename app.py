import os
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from celery_worker import convert_audio_task

load_dotenv()
app = Flask(__name__)

# 업로드 및 출력 폴더 설정
UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "audio-converter"}), 200

@app.route("/convert", methods=["POST"])
def convert_audio():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    
    # 파일 저장
    input_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(input_path)
    
    # Celery 태스크 실행
    task = convert_audio_task.apply_async(args=[input_path])
    
    return jsonify({
        "status": "accepted", 
        "task_id": task.id,
        "message": "Audio conversion started"
    }), 202

@app.route("/status/<task_id>", methods=["GET"])
def get_task_status(task_id):
    task = convert_audio_task.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'status': 'Task is waiting to be processed'
        }
    elif task.state == 'SUCCESS':
        response = {
            'state': task.state,
            'result': task.result
        }
    else:
        response = {
            'state': task.state,
            'status': task.info
        }
    return jsonify(response)

@app.route("/download/<filename>", methods=["GET"])
def download_file(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)