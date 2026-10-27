---
title: "日报：用一句话写出今日核心主题"
date: {{ .Date }}
description: "用一两句话概括今日最重要的财经与科技动态。"
tags: ["财经", "科技"]
draft: true
# card 是日报正文的唯一数据源。页面模板会渲染这张卡片。
# 正文只保留一行 brief shortcode，供 RSS 输出同一张卡片。
# 涨跌和关键数字用记号，不要写 HTML：
#   {up}6%{/up} 红色（涨）  {down}-1.23%{/down} 绿色（跌）  {num}116.7{/num} 加粗数字
# watch 没有可写的日期或事件时，删掉整个 watch 字段，页面会省略「04 接下来关注」。
card:
  market:
    - title: 美股与大宗
      kicker: 一句话分组
      bullets:
        - "标普 {down}-0.52%{/down}，布油约 {num}116.7{/num} 美元，一周涨超 {up}6%{/up}"
  tech:
    - name: 公司或产品
      text: "一句话写清发生了什么，只保留本期已核实的事实。"
  judgment:
    lead: "一句核心判断。"
    body: "用本期要点展开这句判断，不引入卡片以外的数字。"
  watch:
    - when: 10月28日
      text: 只写正文里明确出现的日期和事件
---

{{ printf "{{< brief >}}" }}
