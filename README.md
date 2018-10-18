# Winas Desktop

### Setup

```
sudo apt-get install git
sudo apt-get install npm
sudo npm install -g n
sudo n latest
node -v
git clone https://github.com/wisnuc/winas-desktop.git
cd winas-desktop
npm install --registry=https://registry.npm.taobao.org
npm run rebuild
npm run webpack2
npm start
```

### Development 

```
npm run webpack         // webpack with HMR
NODE_ENV=dev npm start  // start with devtools
```
