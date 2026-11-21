#include <string>

class Solution {
public:
    int strStr(std::string haystack, std::string needle) {
        int n = haystack.size();
        int m = needle.size();
        if (m == 0) return 0;
        for (int i = 0; i + m <= n; i++) {
            bool ok = true;
            for (int j = 0; j < m; j++) {
                if (haystack[i + j] != needle[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return i;
        }
        return -1;
    }
};
