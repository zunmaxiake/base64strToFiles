### 1.把文件编码生成base64字符串
```
var filesCtl = require("files.js");
var path = "resources/newzzz.zip";
filesCtl.fileToBase64(path)     
.then(function(result){
    return res.json({"result":"success","failedMessage":"","val":result});
  })["catch"](function(err){
    return res.json({"result":"failed","failedMessage":err});
  })
```

### 2.根据base64字符串生成文件并存放在指定目录
```
var filesCtl = require("files.js");
var path = "resources",
      fileId = "145200000180987",
      base64Str = "" //base64编码字符串
filesCtl.getFilesByBase64Str(fileId, path, base64Str)
  .then(function(result){
    return res.json({"result":"success","failedMessage":"","val":result});
  })["catch"](function(err){
    return res.json({"result":"failed","failedMessage":err});
  })      
```
注：使用以上方法前，先安装package.json里面的所有依赖库











