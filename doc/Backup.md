# 备份

描述PC客户端的备份操作的逻辑

### 备份Drive和文件夹

+ 以客户端得到的machine id作为设备标记，对应一个备份drive
```json
{
  "op": "backup",
  "label": "PC Backup",
  "client": {
    "id": "40f14464",
    "type": "PC",
    "lastBackupTime": 1543298353690
  }
}
```

+ 用户最多可以选择5个备份文件夹，作为根目录下的子文件夹，其额外包含metadata信息
```json
{
  "name": "media",
  "latestMtime": 1543298353690,
  "localPath": "/home/lxw/Desktop/media"
}
```

+ 备份的文件或文件夹拥有以下额外属性
```json
{
  "bmtime": 1543298353690,
  "bctime": 1543298353690,
  "uptype": "backup"
}
```
