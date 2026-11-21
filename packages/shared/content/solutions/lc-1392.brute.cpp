#include <string>

class Solution {
public:
    std::string longestPrefix(std::string s) {
        int n = s.size();
        for (int len = n - 1; len >= 1; len--) {
            if (s.compare(0, len, s, n - len, len) == 0) {
                return s.substr(0, len);
            }
        }
        return "";
    }
};
