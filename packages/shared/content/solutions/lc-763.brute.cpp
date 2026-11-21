#include <vector>
#include <string>

using namespace std;

class Solution {
    bool canSplit(const string& s, int i, int j) {
        // check that characters in s[i..j] do not appear anywhere outside s[i..j]
        int inSub[26] = {0};
        for (int k = i; k <= j; k++) inSub[s[k] - 'a'] = 1;
        for (int k = 0; k < (int)s.size(); k++) {
            if (k < i || k > j) {
                if (inSub[s[k] - 'a']) return false;
            }
        }
        return true;
    }
public:
    vector<int> partitionLabels(string s) {
        vector<int> res;
        int n = s.size();
        int start = 0;
        while (start < n) {
            for (int end = start; end < n; end++) {
                if (canSplit(s, start, end)) {
                    res.push_back(end - start + 1);
                    start = end + 1;
                    break;
                }
            }
        }
        return res;
    }
};
