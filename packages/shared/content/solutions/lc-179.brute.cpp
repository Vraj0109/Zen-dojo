#include <vector>
#include <string>
#include <algorithm>

using namespace std;

class Solution {
    void permute(vector<string>& s, int idx, string& best) {
        if (idx == (int)s.size()) {
            string cand;
            for (const auto& str : s) cand += str;
            if (cand > best) best = cand;
            return;
        }
        for (int i = idx; i < (int)s.size(); i++) {
            swap(s[idx], s[i]);
            permute(s, idx + 1, best);
            swap(s[idx], s[i]);
        }
    }
public:
    string largestNumber(vector<int>& nums) {
        vector<string> s;
        for (int x : nums) s.push_back(to_string(x));
        string best = "";
        permute(s, 0, best);
        if (!best.empty() && best[0] == '0') return "0";
        return best;
    }
};
