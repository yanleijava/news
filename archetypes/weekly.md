---
title: "周报：用一句话写出本周核心主题"
date: {{ .Date }}
description: "用一两句话概括本周财经与科技领域的关键变化。"
tags: ["财经", "科技"]
draft: true
# 结构与日报相同。栏目是 weekly 时，模板会改成「本周市场 / 本周 AI 与科技 / 本周核心判断 / 下周关注」。
# 只汇总这一周已经发布的日报，不补充日报里没有的数字或事件。
# watch 为空就删掉该字段。
card:
  market:
    - title: 本周主线
      kicker: 一句话分组
      bullets:
        - "从本周日报摘出的事实，涨跌仍用 {up}涨幅{/up} 和 {down}跌幅{/down}。"
  tech:
    - name: 公司或产品
      text: "一句话写清本周最重要的科技进展。"
  judgment:
    lead: "一句本周核心判断。"
    body: "只用本周日报里出现过的事实和数字。"
  watch:
    - when: 下周三
      text: 只写本周日报已经点名的后续事件
---

{{ printf "{{< brief >}}" }}
