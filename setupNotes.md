


# running node as sudo
https://forums.raspberrypi.com/viewtopic.php?t=110986
Re: npm install requires root permission
Wed May 20, 2015 2:07 pm

Hi All,

I got this to work finally. sudo has a secure_path.
by modifying the file: /etc/sudoers to have the defaults section end with:
"Defaults !secure_path"

# install node
pi@w3demopi:~ $ curl -sL https://deb.nodesource.com/setup_22.x | sudo -E bash -
Now install it by running:

pi@w3demopi:~ $ sudo apt-get install -y nodejs