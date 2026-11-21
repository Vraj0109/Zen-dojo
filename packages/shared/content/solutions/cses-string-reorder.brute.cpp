#include <string>
#include <vector>
#include <algorithm>

class Solution {
    bool ok(const int cnt[26], int rem, int last) {
        int mx = 0;
        for (int i = 0; i < 26; i++) {
            if (cnt[i] > mx) mx = cnt[i];
        }
        if (mx > (rem + 1) / 2) return false;
        if (mx == (rem + 1) / 2 && rem % 2 == 1) {
            // odd rem, element with mx must be placed first, can't match last
            for (int i = 0; i < 26; i++) {
                if (cnt[i] == mx && i == last) return false;
            }
        }
        return true;
    }

public:
    std::string stringReorder(std::string s) {
        int cnt[26] = {0};
        for (char c : s) cnt[c - 'A']++;
        int n = s.size();
        if (!ok(cnt, n, -1)) return "-1";
        std::string out;
        int last = -1;
        for (int pos = 0; pos < n; pos++) {
            for (int c = 0; c < 26; c++) {
                if (cnt[c] == 0 || c == last) continue;
                cnt[c]--;
                if (ok(cnt, n - pos - 1, c)) {
                    out += char('A' + c);
                    last = c;
                    break;
                }
                cnt[c]++;
            }
        }
        return out;
    }
};
