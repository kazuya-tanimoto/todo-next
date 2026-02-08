# Todo Next

@docs/PROJECT.md
@docs/TESTING.md

## Stop Hook フィードバック対応

Stop hookでレスポンスがブロックされた場合、そのフィードバックは次のターンの`<system-reminder>`に含まれる。
**次のターンでは、ユーザーの新しい質問に答える前に、まずStop hookの指摘を全て解消すること。**
指摘内容を確認し、必要な検証・修正を行った上で、ユーザーの質問に回答する。
