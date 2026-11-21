class Solution:
    def decodeString(self, s: str) -> str:
        while "]" in s:
            close_pos = s.find("]")
            open_pos = s.rfind("[", 0, close_pos)
            num_start = open_pos
            while num_start > 0 and s[num_start - 1].isdigit():
                num_start -= 1
            k = int(s[num_start:open_pos])
            inner = s[open_pos + 1:close_pos]
            s = s[:num_start] + inner * k + s[close_pos + 1:]
        return s
