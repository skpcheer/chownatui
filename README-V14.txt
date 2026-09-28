CHOWNATUI V14

- Keeps V13 auth behavior. Email confirmation can remain disabled in Supabase.
- Adds a team invite code field during signup.
- Default code: CHOWNATUI888.
- To change it, set VITE_CHOWNATUI_TEAM_CODE in Vercel Project Settings > Environment Variables, then redeploy.
- This code is a convenience gate, not a secret security boundary, because frontend environment values are shipped to the browser.
