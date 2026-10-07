DayNet v4 / 名称・ロゴ・UI改訂パッケージ
2026-10-07

見る順番
assets/brand_board.png：ブランド全体
assets/logo_preview.png：ロゴとアプリアイコン
assets/logo_directions.png：ロゴ3案と採否
assets/ui_overview.png：主要4画面一覧（DMはui_messages.png）
00_product_summary.txt：要点

Claude Codeへの渡し方
元のctoc-makeappを用意し、このフォルダをdesign/DayNet/へ配置。
01_claude_code_prompt.txtを全文渡し、既存コードを確認して順に実装させる。
素材参照パス・全画面・データ・保存・権限・媒体・テスト・Windows11・Vercel・PWAを記載している。
旧デザイン指示と矛盾する場合、今回のDayNet v4の名称・ブランド・UIを優先。
内部の既存ID・DB・認証連携・Cloudinaryフォルダを名称変更だけで作り直さない。

納品内容
00概要 / 01完全版改修プロンプト / 02市場と名称調査 / 03ブランドUI / 04デザイン方向比較 / 05元ソース監査 / 06素材と確認記録。
assets：ロゴSVG/PNG、アプリアイコン、UI5画面、写真、フォント、操作アイコン。
licenses：フォントOFL。
examples：デザイントークン、検証結果。
preview：ローカルで開くHTML見本と、ブランドボードの編集原稿。

範囲
今回は改修デザイン・実装指示を再出力したもの。アプリ本体の変更・デプロイは未実施。
HTMLはタブ切替と見た目を確かめる見本。投稿・DM・検索・アップロード・永続保存は行わない。
架空の人物・数字・会話を本番へ投入しない。元コード、DBダンプ、秘密情報はZIPに含めない。

固定したユーザー要件
名称DayNet、写真・動画SNSが主役、匿名表示名OK。
プロフィールはイキリポイント1つ・残念な弱点1つ・趣味3つを必須。
DM・いいね・気持ちわかる。日記と趣味の集まりも残す。
CinemiXは同系列として控えめに説明。今はアカウント・データを連携しない。

変更したもの
d字マークを2つの三角形へ。黄土・茶をコーラル・ライラック・プラムへ。
Archivo/Zen等をOutfit/BIZ UDPGothicへ。ホーム、プロフィール、下ナビ、ボード構図も更新。

名称・基準書の確認
DayNetは海外通信事業等に先行使用がある。商標未確認。登録名やドメインの空きは未確認。
会話の統合基準と参照済みAstra_master_prompt_first_product.txtを適用。
Astra_master_prompt_v4.txtの原本は参照できていない。
