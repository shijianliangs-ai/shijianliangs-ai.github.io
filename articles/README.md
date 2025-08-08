# Articles 目录 CSS 重构说明

## 概述

为了提高代码的可维护性和复用性，我们将 articles 目录中重复的 CSS 样式提取到了公共文件中。

## 文件结构

```
articles/
├── article-common.css          # 公共样式文件
├── ai-driven-testing-automation.html
├── test-case-design-methods.html
├── index.html
└── README.md
```

## 公共样式文件

`article-common.css` 包含了以下公共样式：

### 布局样式
- `.article-page` - 文章页面容器
- `.article-layout` - 文章布局网格
- `.article-toc` - 目录侧边栏
- `.article-main` - 文章主体区域

### 文章内容样式
- `.article-header` - 文章头部
- `.article-title` - 文章标题
- `.article-meta` - 文章元信息
- `.article-content` - 文章内容区域
- `.article-content h2, h3, p, ul, ol, li` - 文章内容元素
- `.article-content blockquote` - 引用块
- `.article-content code, pre` - 代码块

### 图片样式
- `.article-image` - 图片容器
- `.article-image img` - 图片样式
- `.image-caption` - 图片说明

### 参考文献样式
- `.references` - 参考文献容器
- `.references h3, ul, li, a` - 参考文献元素

### 导航样式
- `.article-navigation` - 文章导航
- `.nav-link` - 导航链接
- `.back-to-articles` - 返回目录按钮

### 响应式设计
- 移动端适配样式

## 使用方法

### 在文章页面中引用公共样式

```html
<link rel="stylesheet" href="article-common.css">
```

### 添加特定样式

每个文章页面可以保留自己特定的样式：

```html
<style>
    /* 特定于该文章的样式 */
    .specific-style {
        /* 样式定义 */
    }
</style>
```

## 重构的文件

1. **ai-driven-testing-automation.html**
   - 移除了重复的公共样式
   - 添加了对 `article-common.css` 的引用
   - 保留了特定于 AI 测试文章的样式

2. **test-case-design-methods.html**
   - 移除了重复的公共样式
   - 添加了对 `article-common.css` 的引用
   - 保留了特定于测试用例设计文章的样式

## 优势

1. **代码复用** - 避免重复的 CSS 代码
2. **维护性** - 公共样式集中管理，修改更方便
3. **一致性** - 确保所有文章页面的样式一致
4. **性能** - 浏览器可以缓存公共 CSS 文件

## 注意事项

- 新增文章页面时，记得引用 `article-common.css`
- 特定于某篇文章的样式可以保留在各自的 HTML 文件中
- 如果需要修改公共样式，需要检查所有文章页面是否受到影响
