### 主要依赖库
* [electron](https://electronjs.org/)
* [cheerio](https://cheerio.js.org/)

### 使用说明

* `npm i` 安装依赖
* `npm start` 本地开发
* `npm run build` 打包--Mac OS

### 功能点

* 展示微信文章
* 文章内图片换源（上传到oss，包括背景图）
* 移除小程序操作
* 为img添加data属性（iframe加载，可在父页面捕获事件）
* 编辑后文章Html输出到`/Documents/df-article-resource`

### keys

* electron配置
* cheerio解析html
* 强制加载文章内图片（图片采用懒加载）
* 下载原图，上传到OSS(Promise.all维护) -- `http、fs模块`
* 导出html到指定目录，并在html内增加postMessage与app指定事件(replace替换) -- `fs模块`


###### `oss-config.json`内配置oss
```
{
    "region": ******,
    "accessKeyId": ******,
    "accessKeySecret": ******,
    "bucket": ******
}