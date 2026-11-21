#include <string>
#include <vector>

class Solution {
public:
    std::string minWindow(std::string s, std::string t) {
        int n = s.size();
        std::vector<int> target(128, 0);
        for (char c : t) target[(unsigned char)c]++;

        std::string best = "";
        for (int i = 0; i < n; i++) {
            std::vector<int> cur(128, 0);
            for (int j = i; j < n; j++) {
                cur[(unsigned char)s[j]]++;
                bool ok = true;
                for (int c = 0; c < 128; c++) {
                    if (cur[c] < target[c]) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    if (best.empty() || j - i + 1 < (int)best.size()) {
                        best = s.substr(i, j - i + 1);
                    }
                    break;
                }
            }
        }
        return best;
    }
};
