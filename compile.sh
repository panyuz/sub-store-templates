#!/bin/bash
SINGBOX="./singbox/sing-box.exe"
RULESETS="./rulesets"

echo "=== 编译自定义规则集 ==="
for json in "$RULESETS"/*.json; do
    name=$(basename "$json" .json)
    echo "  $name.json → $name.srs"
    "$SINGBOX" rule-set compile "$json" -o "$RULESETS/$name.srs"
done
echo "=== 完成 ==="
ls -la "$RULESETS"/*.srs
