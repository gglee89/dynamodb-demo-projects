# What is an ATOMIC COUNTER?
1. Counters that can be incremented OR decremented in an ATOMIC fashion.
2. ATOMIC means, indenpendent of other similar operations.
3. Our goal is the INCREMENT/DECREMENT the counter without interfering with other WRITE operations.
4. IF there are multiple requests to increment a variable, ALL these requests will get APPLIED in the order in which they were received. (NOT IDEMPOTENT).
5. NOT suitable for applications demanding HIGH DEGREE of accuracy.

# Use Case
- Count the visitor to our website.
- NOT suitable for banking/financial transactions where HIGH ACCURACY is needed.