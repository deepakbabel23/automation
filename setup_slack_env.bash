#!/bin/bash
sudo apt install python3-venv
python3 -m venv slack-env
source slack-env/bin/activate
python3 -m pip install -r requirements.txt
