import pyautogui
import subprocess
import time
import sys
from datetime import datetime, timedelta

receiver_txt_window_images = [
    "/home/deepakb/avoma/pyautog_tryouts/receiver_txt_window1.png",
    "/home/deepakb/avoma/pyautog_tryouts/receiver_txt_window2.png",
]

slack_images = [
    "/home/deepakb/avoma/pyautog_tryouts/slack1.png",
    "/home/deepakb/avoma/pyautog_tryouts/slack2.png",
]

available_images = [
    "/home/deepakb/avoma/pyautog_tryouts/slack_active.png",
    "/home/deepakb/avoma/pyautog_tryouts/slack_active1.png",
]

away_images = [
    "/home/deepakb/avoma/pyautog_tryouts/slack_away.png",
    "/home/deepakb/avoma/pyautog_tryouts/slack_away1.png",
]

def wait_for_desired_time(desired_time_str):
    same_hour = False
    same_minutes = False
    current_time_str = ''.join(str(datetime.now()))[11:19]
    if desired_time_str[:2] >= current_time_str[:2]:
        if desired_time_str[:2] == current_time_str[:2]:
            same_hour = True
        if desired_time_str[3:5] >= current_time_str[3:5]:
            if desired_time_str[3:5] == current_time_str[3:5]:
                same_minutes = True
            if same_minutes:
                if desired_time_str[6:8] >= current_time_str[6:8]:
                    while desired_time_str != current_time_str:
                        current_time_str = ''.join(str(datetime.now()))[11:19]
                        continue
                    if desired_time_str == current_time_str:
                        return True
            else:
                while desired_time_str != current_time_str:
                    current_time_str = ''.join(str(datetime.now()))[11:19]
                    continue
                if desired_time_str == current_time_str:
                    return True
    print("cannot launch as current time has already exceeded desired time!!")
    return False

def launch_slack():
    #first launch slack
    cmd = 'slack'
    print("launching slack!!")
    return subprocess.check_call(cmd, shell=True)

def find_compose_button():
    for i in range(5):
        for img in slack_images:
            compose_btn_pos = pyautogui.locateCenterOnScreen(image=img, confidence= 0.8)
            if compose_btn_pos:
                pyautogui.click(int(compose_btn_pos[0]), int(compose_btn_pos[1]))
                return True
            else:
                print("not found compose button on screen!!")
    return False

def find_recipient(recipient):
    print("Searching in progress!!")
    pyautogui.write(recipient, interval=0.80)
    pyautogui.press('enter')
    pyautogui.click(477,998)

def type_message_for_recipient(message):
    print("Sending the desired message!!")
    for i in range(5):
        for img in receiver_txt_window_images:
            msgbox = pyautogui.locateCenterOnScreen(image=img, confidence= 0.6)
            if msgbox:
                pyautogui.typewrite(message=message, interval=0.2)
                pyautogui.press('enter')
                return
            else:
                print("not found messagebox")

def set_availability(status):
    print("setting availability now!!")
    if status == "Active":
        print("Found status=Active!!")
        for i in range(5):
            for img in available_images:
                activePos = pyautogui.locateCenterOnScreen(image=img, confidence= 0.7)
                if activePos:
                    print("setting status as Active!!")
                    pyautogui.click(int(activePos[0]), int(activePos[1]))
                    return
    else:
        print("Found status=Away!!")
        for i in range(5):
            for img in away_images:
                awayPos = pyautogui. locateCenterOnScreen(image=img, confidence=0.8)
                if awayPos:
                    print("setting status as Away!!")
                    pyautogui.click(int(awayPos[0]), int(awayPos[1]))
                    return

def show_help():
    print("Invalid command..Please run this program like below!!")
    print("Example 1: Launch slack and set yourself as Away and send 'hi there' to 'Deepak B' user at this time: 20:03:03")
    print("python3 slack_schedule_send_app.py 'Deepak B' 'hi there' 20:03:03 Away")
    print("Example 2: Launch slack and set yourself as Active and send 'hi there' to 'John haywire' user at this time: 20:50:02")
    print("python3 slack_schedule_send_app.py 'Deepak B' 'hi there' 20:50:40 Active")

if __name__=="__main__":
    #print(sys.argv)
    if len(sys.argv) < 5:
        show_help()
        sys.exit()
    receiver_name = str(sys.argv[1])
    message_to_send = str(sys.argv[2])
    time_to_send = time.strftime(sys.argv[3])
    time_to_send_str = ''.join(str(time_to_send))
    status = str(sys.argv[4])
    print(f"{receiver_name}")
    print(f"{message_to_send}")
    print(f"{time_to_send}")
    print(f" current_time = {''.join(str(datetime.now()))[11:19]}")
    should_launch_slack = wait_for_desired_time(desired_time_str=time_to_send_str)
    if should_launch_slack:
        launch_slack()
        time.sleep(15)
        #wait for 15 seconds to let slack load fully
        set_availability(status=status)
        is_compose_button_found = find_compose_button()
        if is_compose_button_found:
            print("found compose button..Now finding recipient!!")
            find_recipient(recipient=receiver_name)
            type_message_for_recipient(message=message_to_send)
    
    sys.exit()