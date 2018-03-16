# 微信文章转换器

基于electron

* `npm i` 安装依赖
* `npm start` 本地调试
* `npm run package` 打包，输出MacOS下可执行文件



> TODO

* 文章加载替换图片源（`oss-config.json`内配置oss），包括背景图 
```
{
    "region": ******,
    "accessKeyId": ******,
    "accessKeySecret": ******,
    "bucket": ******
}
```
* 解除文章内绑定的小程序链接
* 文章内img元素添加data属性（iframe加载，可在父页面捕获事件）