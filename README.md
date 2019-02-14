[![Build Status](https://travis-ci.org/hipages/inceptum-cqrs.svg?branch=master)](https://travis-ci.org/hipages/inceptum-cqrs)
[![codecov](https://codecov.io/gh/hipages/inceptum-cqrs/branch/master/graph/badge.svg)](https://codecov.io/gh/hipages/inceptum-cqrs)


Inceptum CQRS
====

## Optimistic Locking

In short, an aggregate update will fail if the aggregate state has been changed in data storage (aggregate events are added) since the last read of the aggregate. 

### To use Optimistic locking ( by default ):
Set UseOptimisticLocking to true in config yml
```
Application:
  UseOptimisticLocking: true
``` 
In an application, each event executor needs to extend EventExecutor class

In the scenario where locking is not required meaning aggregate will be less likely to being updated concurrently by transations, optimistic locking can be turned off. 

### To turn off locking:

Set UseOptimisticLocking to false in config yml
```
Application:
  UseOptimisticLocking: false
``` 
In an application, each event executor needs to extend EventExecutorNoLocking class

Test During Local Development
--

It is handy to test changes in a project implementation without publishing. Follow the steps below to add the changed inceptum-cqrs as a dependency of a project:

Build and pack at inceptum-cqrs project root. Ensure to bump version in package.json before build and pack
```
yarn build
npm pack
```
At inceptum-cqrs root, there should be a package created. eg inceptum-cqrs-0.20.8.tgz

Change directory to the depending project. eg:
```
cd ../nuntius
```

Add the created package as dependency
```
npm install ../inceptum-cqrs/inceptum-cqrs-0.20.8.tgz
```

This installation may cause type confliction with existing inceptum in the project. Fix it by reinstalling all dependencies.
```
rm -rf node_modules && yarn
```
Done!
