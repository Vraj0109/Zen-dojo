# verify: skip-stress
from typing import List
from collections import defaultdict

class Solution:
    def accountsMerge(self, accounts: List[List[str]]) -> List[List[str]]:
        id_map = {}
        emails = []
        owner = []
        for a in accounts:
            for em in a[1:]:
                if em not in id_map:
                    id_map[em] = len(emails)
                    emails.append(em)
                    owner.append(a[0])
        par = list(range(len(emails)))
        def find(x):
            if par[x] != x:
                par[x] = find(par[x])
            return par[x]
        for a in accounts:
            for em in a[2:]:
                par[find(id_map[em])] = find(id_map[a[1]])
        groups = defaultdict(list)
        for i, em in enumerate(emails):
            groups[find(i)].append(em)
        out = []
        for root, em_list in groups.items():
            em_list.sort()
            out.append([owner[root]] + em_list)
        return out