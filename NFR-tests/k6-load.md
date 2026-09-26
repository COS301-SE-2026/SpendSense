# k6 Load testing Output results

```zsh
➜  NFR-tests git:(NFR) ✗ k6 run load.js

         /\      Grafana   /‾‾/  
    /\  /  \     |\  __   /  /   
   /  \/    \    | |/ /  /   ‾‾\ 
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/ 


     execution: local
        script: load.js
        output: -

     scenarios: (100.00%) 1 scenario, 100 max VUs, 6m30s max duration (incl. graceful stop):
              * default: Up to 100 looping VUs for 6m0s over 7 stages (gracefulRampDown: 30s, gracefulStop: 30s)



  █ THRESHOLDS 

    http_req_duration
    ✓ 'p(95)<500' p(95)=334.39ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%


  █ TOTAL RESULTS 

    checks_total.......: 16729   46.336641/s
    checks_succeeded...: 100.00% 16729 out of 16729
    checks_failed......: 0.00%   0 out of 16729

    ✓ status is 200

    HTTP
    http_req_duration..............: avg=302.51ms min=251.49ms med=299.42ms max=712.93ms p(90)=328.64ms p(95)=334.39ms
      { expected_response:true }...: avg=302.51ms min=251.49ms med=299.42ms max=712.93ms p(90)=328.64ms p(95)=334.39ms
    http_req_failed................: 0.00% 0 out of 16729
    http_reqs......................: 16729 46.336641/s

    EXECUTION
    iteration_duration.............: avg=1.3s     min=1.25s    med=1.3s     max=1.71s    p(90)=1.32s    p(95)=1.33s   
    iterations.....................: 16729 46.336641/s
    vus............................: 1     min=1          max=100
    vus_max........................: 100   min=100        max=100

    NETWORK
    data_received..................: 21 MB 58 kB/s
    data_sent......................: 15 MB 42 kB/s

running (6m01.0s), 000/100 VUs, 16729 complete and 0 interrupted iterations
default ✓ [======================================] 000/100 VUs  6m0s

```