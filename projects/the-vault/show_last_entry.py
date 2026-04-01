import sqlite3, json
conn = sqlite3.connect('/Users/operator/repos/MainFrame/projects/the-vault/data/vault.db')
row = conn.execute('SELECT id,title,domain,category,tags,summary,key_points,read_time FROM entries ORDER BY saved_at DESC LIMIT 1').fetchone()
try: tags = ' '.join(['`'+t+'`' for t in json.loads(row[4])]) if row[4] else ''
except: tags = str(row[4]) if row[4] else ''
try: kp = json.loads(row[6]) if row[6] else []
except: kp = []
points = '\n'.join(['• '+p for p in kp[:3]]) if kp else '• See summary'
card = f'📥 **Vaulted: {row[1]}**\n🔗 {row[2]} · {row[3]} · {row[7]} min read\n\n> {row[5]}\n\n**Key Points:**\n{points}\n\n🏷️ {tags}\n🆔 `{row[0]}`'
print(card)
conn.close()
