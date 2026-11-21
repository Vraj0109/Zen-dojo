#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<string> palindromeQueries(string s, vector<vector<string>>& queries) {
        vector<string> ans;
        for (const auto& q : queries) {
            if (q[0] == "1") {
                int k = stoi(q[1]);
                char c = q[2][0];
                s[k - 1] = c;
            } else {
                int a = stoi(q[1]) - 1;
                int b = stoi(q[2]) - 1;
                bool is_pal = true;
                while (a < b) {
                    if (s[a] != s[b]) {
                        is_pal = false;
                        break;
                    }
                    a++;
                    b--;
                }
                if (is_pal) ans.push_back("YES");
                else ans.push_back("NO");
            }
        }
        return ans;
    }
};
