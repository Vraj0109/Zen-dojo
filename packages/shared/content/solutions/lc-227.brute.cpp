#include <string>
#include <vector>
#include <numeric>

using namespace std;

class Solution {
public:
    int calculate(string s) {
        vector<int> vals;
        vector<char> ops;
        int cur = 0;
        bool hasNum = false;
        for (char c : s) {
            if (isdigit(c)) {
                cur = cur * 10 + (c - '0');
                hasNum = true;
            } else if (c == '+' || c == '-' || c == '*' || c == '/') {
                vals.push_back(cur);
                cur = 0;
                hasNum = false;
                ops.push_back(c);
            }
        }
        if (hasNum) vals.push_back(cur);

        // Pass 1: do * and /
        vector<int> nextVals;
        vector<char> nextOps;
        nextVals.push_back(vals[0]);
        for (size_t i = 0; i < ops.size(); i++) {
            char op = ops[i];
            int nextVal = vals[i + 1];
            if (op == '*') {
                nextVals.back() *= nextVal;
            } else if (op == '/') {
                nextVals.back() /= nextVal;
            } else {
                nextOps.push_back(op);
                nextVals.push_back(nextVal);
            }
        }

        // Pass 2: do + and -
        int res = nextVals[0];
        for (size_t i = 0; i < nextOps.size(); i++) {
            if (nextOps[i] == '+') res += nextVals[i + 1];
            else res -= nextVals[i + 1];
        }
        return res;
    }
};
