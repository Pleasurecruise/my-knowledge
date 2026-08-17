---
title: 可扩展的知识边界
summary: 用稳定的内容模型承载不断增加的语言与表现形式。
tags:
  - engineering/architecture
  - knowledge/i18n
---

# 可扩展的知识边界

## 内容模型

> [!NOTE] locale 是内容的一个维度，不是另一套文章类型。

同一篇文章可以连接到 [[related-article|相关实践]]，也可以保留公式 $x^2$。

```ts
const edition: string = "zh";
```

```mermaid
graph LR
  Content --> Edition
  Edition --> Renderer
```

## 数据视图

```vega-lite
{"$schema":"https://vega.github.io/schema/vega-lite/v6.json","data":{"values":[{"locale":"zh","count":1},{"locale":"en","count":1},{"locale":"ja","count":1}]},"mark":"bar","encoding":{"x":{"field":"locale","type":"nominal"},"y":{"field":"count","type":"quantitative"}}}
```

```json-canvas
{"nodes":[{"id":"content","type":"text","text":"Article","x":0,"y":0,"width":220,"height":100},{"id":"edition","type":"text","text":"Edition","x":320,"y":120,"width":220,"height":100},{"id":"renderer","type":"text","text":"Renderer","x":640,"y":20,"width":220,"height":100}],"edges":[{"id":"content-edition","fromNode":"content","toNode":"edition","label":"contains"},{"id":"edition-renderer","fromNode":"edition","toNode":"renderer","label":"presents"}]}
```
