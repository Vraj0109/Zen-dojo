from collections import defaultdict

class Solution:
    def accountsMerge(self, accounts: list[list[str]]) -> list[list[str]]:
        adj = defaultdict(list)
        email_to_name = {}

        for acc in accounts:
            name = acc[0]
            first_email = acc[1]
            email_to_name[first_email] = name
            for i in range(1, len(acc)):
                email = acc[i]
                email_to_name[email] = name
                if i > 1:
                    adj[first_email].append(email)
                    adj[email].append(first_email)

        visited = set()
        res = []

        def dfs(email: str, comp: list) -> None:
            visited.add(email)
            comp.append(email)
            for nxt in adj[email]:
                if nxt not in visited:
                    dfs(nxt, comp)

        for email, name in email_to_name.items():
            if email not in visited:
                comp = []
                dfs(email, comp)
                res.append([name] + sorted(comp))
        return res
