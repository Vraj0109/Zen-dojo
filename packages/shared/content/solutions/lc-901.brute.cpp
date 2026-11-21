#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> calculateSpans(vector<int>& prices) {
        int n = prices.size();
        vector<int> res(n);
        for (int i = 0; i < n; i++) {
            int span = 0;
            for (int j = i; j >= 0; j--) {
                if (prices[j] <= prices[i]) span++;
                else break;
            }
            res[i] = span;
        }
        return res;
    }
};
