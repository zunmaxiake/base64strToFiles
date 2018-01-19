var files = {};
var Promise = require('bluebird');
var fs = require("fs");
var _ = require('underscore');
var execAsync = Promise.promisify(require('child_process').exec);
var s = require("underscore.string");
var Readable = require('stream').Readable

var unzip = require("unzip");

Promise.promisifyAll(fs);

files.fileToBase64 = function(filePath) {    
    // console.log(filePath,typeof(filePath));
    return new Promise(function (resolve, reject) {
      // read binary data
      try {
        var bitmap = fs.readFileSync(filePath);
        // convert binary data to base64 encoded string
        return resolve(new Buffer(bitmap).toString('base64'));
      } catch (err) {
        logger.error(err);
        return reject("文件转换成base64格式报错");
      }
    })          
} 

files.base64ToFile = function (base64str, filePath) {
    // create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
    var bitmap = new Buffer(base64str, 'base64');
    // write buffer to file    
    // console.log('******** File created from base64 encoded string ********');
    return fs.writeFileAsync(filePath, bitmap);    
}

var wrapperAsync = function(callback,out) {
	// console.log("out:",out);
	out = out.trim();
	if(s.endsWith(out, 'charset=binary')) {
		return callback(out.split(';')[0]);
	}
	else {
		return callback(out);
	}	
};

var fileAsync = function(path,callback){
	var wrapperAsyncBind = wrapperAsync.bind(null,callback);
	execAsync('file -b --mime-type --mime-encoding ' + path, {
		maxBuffer : 1024 * 1024
	})
	.then(wrapperAsyncBind);
}

var getFileTypeAsync = function(path){
    // console.log("getFileTypeAsync path:",path);
    return new Promise(function(resolve,reject){
        fileAsync(path,function(out){
            console.log("new out:",out);
            return resolve(out);
        })
    })
}

var explorerDir = function(dir){   
    // console.log("explorerDir111111:",dir) 
    return fs.readdirAsync(dir).then(function(files){
        // console.log("readdirAsync.then1111111111:",files) 
        return Promise.all(files.map(function(f){
            // console.log("dir1111111111111:",dir);
            // console.log("f22222222222:",f);            
            var file = dir+'\/'+f;//[].join(dir,f);
            // console.log("file333333333333333:",file);
            return fs.statAsync(file).then(function(stat){
                if (stat.isDirectory()) {
                    return explorerDir(file);
                } else {
                    // console.log("file4444444444:",file);
                    return [file];
                }
            })
        }))
    }).then(function(files){
        // console.log("files555555555555:",files);
        files = _.compact(files);
        // console.log("files55555........5555555:",files);
        return files.reduce(function(pre,cur){
            // console.log("pre666666666666:",pre)
            // console.log("cur777777777777:",cur)
            return pre.concat(cur);
        })
    })
}

var getFileTypeByTypeStr = function(typeStr){
    var fileType = ""; 
    switch(typeStr){
        case "image/jpeg":
        fileType = ".jpg";
        break;
        case "text/plain; charset=us-ascii":
        fileType = ".txt";
        break;
        case "application/pdf":
        fileType = ".pdf";
        break;
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        fileType = ".xls";
        break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        fileType = ".docx";
        break;     
        case "application/msword":
        fileType = ".doc";
        break;               
    }  
    return fileType;
}

var ergodicFiles = function(files){
    return Promise.all(files.map(function(f){
        // return getFileTypeAsync(f).then(function(result){
            var fileType = "";//getFileTypeByTypeStr(result);
            var fileArr = f.split("\/");
            var fileName = fileArr.slice(fileArr.length-1,fileArr.length).toString();  
            //console.log("asdfassdf11111111111:",{path:f,fileName:fileName,fileType:fileType})                        
            return Promise.resolve({path:f,fileName:fileName,fileType:fileType});                       
        // })
    }))   
}

var renamesByObjFiles = function(objFiles){
    // console.log("renamesByObjFiles objFiles param9999999999999:",objFiles)
    return Promise.all(objFiles.map(function(objFile){
        // console.log("renamesByObjFiles objFiles oldparam:",objFile.path)
        // console.log("renamesByObjFiles objFiles newparam:",objFile.path + objFile.fileType)
        return fs.renameAsync(objFile.path,objFile.path + objFile.fileType)
        .then(function(){
            // console.log("renamesByObjFiles11111111111:",{path:objFile.path + objFile.fileType,fileName:objFile.fileName + objFile.fileType,fileType:objFile.fileType})
            // console.log("renamesByObjFiles22222222222:",objFile.path)
            // console.log("renamesByObjFiles33333333333:",objFile.fileName)
            // console.log("renamesByObjFiles44444444444:",objFile.fileType)
            // console.log("renamesByObjFiles55555555555:",objFile.path + objFile.fileType)
            // console.log("renamesByObjFiles66666666666:",objFile.fileName + objFile.fileType)            
            return {path:objFile.path + objFile.fileType,fileName:objFile.fileName + objFile.fileType,fileType:objFile.fileType};
        })
        .catch(function(err){
            // console.log("renamesByObjFiles err888888888888888:",err);
            return Promise.reject(err);
        })
    }))    
}

var getAllFiles = function(dir){
    // console.log("getAllFiles1111111111111:",dir)
    return explorerDir(dir)
    .then(ergodicFiles)
    .then(renamesByObjFiles)
    .catch(function(err){
        return Promise.reject(err);
    })
}

var extractZip = function(newFilePath,filePath){
   return new Promise(function(resolve,reject){
        var stream = fs.createReadStream(newFilePath);
        // console.log("unzip111111111:",filePath)
        stream.pipe(unzip.Extract({path:filePath}))
        .on('close', function (entry) {   
            return resolve(filePath);  
          });         
   })
}

files.getFilesByBase64Str = function (fileId, path, base64Str) { 
    return new Promise(function(resolve,reject){
        var filePath = path+"\/"+fileId,
        oldFilePath = filePath+".txt",
        newFilePath = filePath+".zip"; 
        var bitmap = Buffer.from(base64Str, 'base64');
        var readSteam = new Readable
        readSteam.push(bitmap)   
        readSteam.push(null)   
        readSteam.pipe(unzip.Extract({path:filePath}))
        .on('close', function (entry) {   
            return resolve(filePath);  
        })
        .on('error',function(error){
            console.log(error)
            return reject(error);
        })
    })
    .then(function(result){
        return getAllFiles(result);
    })
    .catch(function(err){        
        console.log("err11111111111:",err);
        return Promise.reject(err);
    })


    // var extractZip = function(newFilePath,filePath){
    //     return new Promise(function(resolve,reject){
    //          var stream = fs.createReadStream(newFilePath);
    //          // console.log("unzip111111111:",filePath)
    //          stream.pipe(unzip.Extract({path:filePath}))
    //          .on('close', function (entry) {   
    //              return resolve(filePath);  
    //            });         
    //     })
    //  }


    // //var renameAsyncBind = fs.renameAsync.bind(null,oldFilePath,newFilePath);
    // return fs.writeFileAsync(oldFilePath, bitmap)
    // .then(function(){
    //     return fs.renameAsync(oldFilePath,newFilePath);
    // })
    // .then(function(){
    //     return extractZip(newFilePath,filePath)
    // })    
    // .then(function(result){
    //     // console.log("filePath11111111111:",result);
    //     return getAllFiles(result);
    // })  
    // .then(function(result){
    //     return fs.unlinkAsync(newFilePath)
    //     .then(function(){
    //         return Promise.resolve(result);
    //     })
    // })    
    // .catch(function(err){        
    //     // console.log("err11111111111:",err);
    //     return Promise.reject(err);
    // })
}

module.exports = files;