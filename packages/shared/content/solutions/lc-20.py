# verify: skip-stress
class Solution:
    def isValid(self, s: str) -> bool:
        st: list[str] = []
        for c in s:
            if c in '({[':
                st.append(c)
            else:
                if not st:
                    return False
                o = st.pop()
                if (c == ')' and o != '(') or (c == '}' and o != '{') or (c == ']' and o != '['):
                    return False
        return len(st) == 0
