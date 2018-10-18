# 版本发布

使用`electron-builder`打包，配置文件是`electron-builder.yml`，相关文档见[docs](https://www.electron.build/)

### 下载源码

```bash
git clone https://github.com/wisnuc/phi-electron.git
cd phi-electron
npm install
npm run rebuild
npm run webpack2
```

### 更新代码

```bash
git pull
npm install
npm run webpack2
```

### windows下打包

需要在windows环境下运行， 打包32位和64位两个版本，打包完成的文件会放在dist目录下

```bash
arch=ia32 npm run dist-ia32 && arch=x64 npm run dist-x64
```

### mac下打包

需要mac环境下运行，打包完成的文件会放在dist目录下

```bash
npm run dist-mac
```
