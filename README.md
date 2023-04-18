# Free Send later utility for Slack!!
### Sample fun utility which can help you send a message to a recipient on slack at your own convenient time(same day) without you have to open and draft the message. You should also pass your "status" info(Show as Active/Show as Away) to this utility.
### Assumes that your laptop is running and internet connection is ON and slack is installed.
### Remember to download the png image files in your local Ubunutu/Mac system and use the correct path in the code for these images.
### Check out the show_help() command for more details on how to run the actual command to send message
### Also includes a helper bash script which helps to set up all necessary environments/packages etc. for this program to run. Just make sure to give execute permissions to the bash script.

### Example 1: Launch slack and set yourself as Away and send 'hi there' to 'Deepak B' user at this time: 20:03:03"
```
python3 slack_schedule_send_app.py 'Deepak B' 'hi there' 20:03:03 Away
```

### Example 2: Launch slack and set yourself as Active and send 'hi there' to 'John haywire' user at this time: 20:50:02"
```
python3 slack_schedule_send_app.py 'Deepak B' 'hi there' 20:50:40 Active
```
### Have fun!! Enjoy!!

## Disclaimer: This is created just for fun and uses image recognition internally. So if current slack UI changes it won't work out of the box without code changes!!
