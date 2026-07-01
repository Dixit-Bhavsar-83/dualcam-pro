from flask import Flask, render_template, jsonify, request
import os

app = Flask(__name__)

@app.route('/')
def index():
    # Ye bina kisi error ke aapka full-screen custom UI load karega
    return render_template('index.html')

if __name__ == '__main__':
    # Render automatic PORT assignment karta hai, isliye ye setup zaroori hai
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
