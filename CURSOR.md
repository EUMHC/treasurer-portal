I am the treasurer for the hockey club EUMHC

I want to make a basic web dashboard to manage finances. 

To start have a basic page which allows uploading of a .csv file of transactions as shown in transactions.csv. There should be basic options on this page also, starting balance. 

Then parse these transactions into a data structure. 

Then have a table view of the transactions for each month for income and expenditures taking a running total. Then there should be a select for choosing a category for each payment. 

The categories should be customizable list but take the defaults from the code.gs file. 

Then have a yearly summary page outlining the income and expenses per month per category. 

And a budget summary page measuring budget values for each category against the actual values for the year. 

Changes and category selections should be stored to localstorage. 

Have an export button to create an styled google sheet or similar structured nicely (this is the end goal)


Tech: 
 - Use Vite to build the project
 - React and Typescript
 - Use a component library for styling with base css

Note: There is some useful info in the old app script code.gs with colours, logo etc