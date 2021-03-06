(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    

    var EntityType = breeze.EntityType;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var NamingConvention = breeze.NamingConvention;
    var EntityQuery = breeze.EntityQuery;
    var DataService = breeze.DataService;
    

    var newEm = testFns.newEm;

    function newAltEm() {
        var altServiceName = "breeze/MetadataTest";

        var dataService = new DataService({
            serviceName: altServiceName,
        });
        var altMs = new MetadataStore({
            // namingConvention: NamingConvention.camelCase
        });

        return new EntityManager({
            dataService: dataService,
            metadataStore: altMs
        });
    }


    module("metadata", {
        setup: function () {
            testFns.setup(); 
        },
        teardown: function () {

        }
    });

    test("add custom metadata", function() {
        var em = testFns.newEm();
        var store = em.metadataStore;
        
        var custType = store.getEntityType("Customer");
        var namespace = custType.namespace;
        ok(store.hasMetadataFor(testFns.serviceName));
        var customMetadata = makeCustomMetadata(namespace);
        store.importMetadata(customMetadata, true);
       
        checkCustomType(custType);
        checkCustomProp(custType, "customerID");
        checkCustomProp(custType, "companyName");
        checkCustomProp(custType, "orders");
        
    });

    test("export/import custom metadata", function () {
        var em = testFns.newEm();
        var store = em.metadataStore;

        var custType = store.getEntityType("Customer");
        var namespace = custType.namespace;
        ok(store.hasMetadataFor(testFns.serviceName));
        var customMetadata = makeCustomMetadata(namespace);
        store.importMetadata(customMetadata, true);
        var exported = store.exportMetadata();
        var store2 = new MetadataStore();
        store2.importMetadata(exported);

        var custType2 = store2.getEntityType("Customer");
        checkCustomType(custType2);
        checkCustomProp(custType2, "customerID");
        checkCustomProp(custType2, "companyName");
        checkCustomProp(custType2, "orders");

    });

   

    test("create metadata add entity Type + custom ctor", function () {
        var store = new MetadataStore();
        var eto = {}
        eto.shortName = "type1";
        eto.namespace = "mod1";
        eto.dataProperties = new Array();
        eto.autoGeneratedKeyType = breeze.AutoGeneratedKeyType.Identity;
        eto.custom = makeCustomTypeAnnot("type1");

        var dpo = {};
        dpo.name = "id";
        dpo.dataType = breeze.DataType.Int32;
        dpo.isNullable = false;
        dpo.isPartOfKey = true;
        dpo.custom = makeCustomPropAnnot("id");

        var dp = new breeze.DataProperty(dpo);
        eto.dataProperties.push(dp);

        dpo = {};
        dpo.name = "prop1";
        dpo.dataType = breeze.DataType.Int32;
        dpo.isNullable = false;
        dpo.isPartOfKey = false;
        dpo.custom = makeCustomPropAnnot("prop1");

        dp = new breeze.DataProperty(dpo);
        eto.dataProperties.push(dp);            

        var et = new breeze.EntityType(eto);
        store.addEntityType(et);
        ok(et.metadataStore === store, "should have set the metadataStore prop");

        var custType = store.getEntityType("type1");
        checkCustomType(custType);
        checkCustomProp(custType, "id");
        checkCustomProp(custType, "prop1");
        

    });

    test("create metadata add entity Type - v2 + custom setProperties", function () {
        var store = new MetadataStore();
        var eto = {}
        eto.shortName = "type1";
        eto.namespace = "mod1";
        eto.dataProperties = new Array();
        eto.autoGeneratedKeyType = breeze.AutoGeneratedKeyType.Identity;
        var et = new breeze.EntityType(eto);
        et.setProperties({ custom: makeCustomTypeAnnot("type1") });

        var dpo = {};
        dpo.name = "id";
        dpo.dataType = breeze.DataType.Int32;
        dpo.isNullable = false;
        dpo.isPartOfKey = true;

        var dp = new breeze.DataProperty(dpo);
        et.addProperty(dp);
        dp.setProperties({ custom: makeCustomPropAnnot("id") });

        dpo = {};
        dpo.name = "prop1";
        dpo.dataType = breeze.DataType.Int32;
        dpo.isNullable = false;
        dpo.isPartOfKey = false;

        dp = new breeze.DataProperty(dpo);
        et.addProperty(dp);
        dp.setProperties({ custom: makeCustomPropAnnot("prop1") });

        store.addEntityType(et);
        
        ok(et.metadataStore === store, "should have set the metadataStore prop");

        checkCustomType(et);
        checkCustomProp(et, "id");
        checkCustomProp(et, "prop1");

    });
    
    test("create metadata and use it for save - CodeFirst only", function () {

        var em = createEmWithTimeGroupMetadata();

        var timeGroupType = em.metadataStore.getEntityType("TimeGroup");
        ok(timeGroupType, "TimeGroup type is in the store");

        var timeGroup = em.createEntity('TimeGroup', {
            Comment: "This was added for a test"
        });

        stop();
        em.saveChanges().then(function (data) {

            var timeGroupId = timeGroup.getProperty("Id");

            ok(timeGroupId > 0, "the timeGroup Id is " + timeGroupId + ", indicating it has been saved");

        }).fail(testFns.handleFail).fin(start);


    });
    
    test("create metadata and insert using existing entity re-attached - CodeFirst only", function () {

        var em0 = createEmWithTimeGroupMetadata();

        var em = createEmWithTimeGroupMetadata();

        var timeGroupType = em.metadataStore.getEntityType("TimeGroup");
        ok(timeGroupType, "TimeGroup type is in the store");

        var q = new EntityQuery()
            .from("TimeGroups")
            .take(2);
        var timeGroup;
        stop();
        em.executeQuery(q).then(function (data) {
            timeGroup = data.results[0];
            em.detachEntity(timeGroup);
            em.attachEntity(timeGroup, breeze.EntityState.Added);
            timeGroup.setProperty("Id", -1);
            timeGroup.setProperty("Comment", "This was re-attached");
            return em.saveChanges();
        }).then(function (sr) {
            var timeGroupId = timeGroup.getProperty("Id");

            ok(timeGroupId > 0, "the timeGroup Id is " + timeGroupId + ", indicating it has been saved");
        }).fail(testFns.handleFail).fin(start);
    });

 
    test("create metadata - multiple subtypes with same navigation properties", function () {

        var em = createEmWithTimeGroupMetadata(true);

        var timeGroupType = em.metadataStore.getEntityType("TimeGroup");
        ok(timeGroupType, "TimeGroup type is in the store");

        var timeGroupType = em.metadataStore.getEntityType("FooBar");
        ok(timeGroupType, "FooBar type is in the store");

        var testComment1 = "This was added to TimeGroup";
        var testComment2 = "This was added to FooBar";

        var timeGroup = em.createEntity('TimeGroup', {
            Comment: testComment1
        });
        ok(timeGroup.getProperty("Comment") == testComment1, "timeGroup.Comment matches");

        var fooBar = em.createEntity('FooBar', {
            Comment: testComment2
        });
        ok(fooBar.getProperty("Comment") == testComment2, "fooBar.Comment matches");


    });


    function createEmWithTimeGroupMetadata(addFooBar) {

        // Domain model defined here; entity manager created below

        var __extends = this.__extends || function (d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
            function __() { this.constructor = d; }
            __.prototype = b.prototype;
            d.prototype = new __();
        };

        var domainModel;
        (function (domainModel) {
            (function (entities) {
                var CodeBase = (function () {
                    function CodeBase() {
                    }
                    CodeBase.addEntityMetadata = function (store) {
                        var eto, dpo, dp, npo, np, et, val;
                        eto = new Object();
                        eto.shortName = "CodeBase";
                        eto.namespace = "Foo";
                        eto.dataProperties = new Array();
                        eto.navigationProperties = new Array();
                        eto.autoGeneratedKeyType = breeze.AutoGeneratedKeyType.Identity;

                        dpo = new Object();
                        dpo.name = "Id";
                        dpo.dataType = breeze.DataType.Int32;
                        dpo.isNullable = false;
                        dpo.isPartOfKey = true;
                        dpo.validators = new Array();

                        dp = new breeze.DataProperty(dpo);
                        eto.dataProperties.push(dp);

                        et = new breeze.EntityType(eto);

                        et.guid = breeze.core.getUuid(); // to see distinct entity types while debugging
                        store.addEntityType(et);
                        store.registerEntityTypeCtor("CodeBase", CodeBase);
                    };
                    CodeBase.typeName = "CodeBase";
                    return CodeBase;
                })();
                entities.CodeBase = CodeBase;
            })(domainModel.entities || (domainModel.entities = {}));
            var entities = domainModel.entities;
        })(domainModel || (domainModel = {}));


        (function (domainModel) {
            (function (entities) {
                var TimeGroup = (function (_super) {
                    __extends(TimeGroup, _super);
                    function TimeGroup() {
                        if (_super) {
                            _super.apply(this, arguments);
                        }
                    }
                    TimeGroup.addEntityMetadata = function (store) {
                        var eto, dpo, dp, npo, np, et, val;
                        eto = new Object();
                        eto.shortName = "TimeGroup";
                        eto.namespace = "Foo";
                        eto.dataProperties = new Array();
                        eto.navigationProperties = new Array();
                        eto.autoGeneratedKeyType = breeze.AutoGeneratedKeyType.Identity;

                        dpo = new Object();
                        dpo.name = "Id";
                        dpo.dataType = breeze.DataType.Int32;
                        dpo.isNullable = false;
                        dpo.isPartOfKey = true;
                        dpo.validators = new Array();

                        dp = new breeze.DataProperty(dpo);
                        eto.dataProperties.push(dp);

                        dpo = new Object();
                        dpo.name = "Comment";
                        dpo.dataType = breeze.DataType.String;
                        dpo.isNullable = false;
                        dpo.isPartOfKey = false;
                        dpo.validators = new Array();

                        dp = new breeze.DataProperty(dpo);
                        eto.dataProperties.push(dp);

                        npo = new Object();
                        npo.name = "TimeLimits";
                        npo.associationName = "FK_TimeGroup_TimeLimits";
                        npo.validators = new Array();
                        npo.isScalar = false;
                        npo.entityTypeName = "TimeLimit";

                        np = new breeze.NavigationProperty(npo);
                        eto.navigationProperties.push(np);

                        et = new breeze.EntityType(eto);

                        et.guid = breeze.core.getUuid(); // to see distinct entity types while debugging
                        store.addEntityType(et);

                        store.registerEntityTypeCtor("TimeGroup", TimeGroup);
                    };
                    TimeGroup.typeName = "TimeGroup";
                    return TimeGroup;
                })(entities.CodeBase);
                entities.TimeGroup = TimeGroup;
            })(domainModel.entities || (domainModel.entities = {}));
            var entities = domainModel.entities;
        })(domainModel || (domainModel = {}));


        (function (domainModel) {
            (function (entities) {
                var FooBar = (function (_super) {
                    __extends(FooBar, _super);
                    function FooBar() {
                        if (_super) {
                            _super.apply(this, arguments);
                        }
                    }
                    FooBar.addEntityMetadata = function (store) {
                        var eto, dpo, dp, npo, np, et, val;
                        eto = new Object();
                        eto.shortName = "FooBar";
                        eto.namespace = "Foo";
                        eto.dataProperties = new Array();
                        eto.navigationProperties = new Array();
                        eto.autoGeneratedKeyType = breeze.AutoGeneratedKeyType.Identity;

                        dpo = new Object();
                        dpo.name = "Id";
                        dpo.dataType = breeze.DataType.Int32;
                        dpo.isNullable = false;
                        dpo.isPartOfKey = true;
                        dpo.validators = new Array();

                        dp = new breeze.DataProperty(dpo);
                        eto.dataProperties.push(dp);

                        dpo = new Object();
                        dpo.name = "Comment";
                        dpo.dataType = breeze.DataType.String;
                        dpo.isNullable = false;
                        dpo.isPartOfKey = false;
                        dpo.validators = new Array();

                        dp = new breeze.DataProperty(dpo);
                        eto.dataProperties.push(dp);

                        npo = new Object();
                        npo.name = "TimeLimits";
                        npo.associationName = "FK_TimeGroup_TimeLimits";
                        npo.validators = new Array();
                        npo.isScalar = false;
                        npo.entityTypeName = "TimeLimit";

                        np = new breeze.NavigationProperty(npo);
                        eto.navigationProperties.push(np);

                        et = new breeze.EntityType(eto);

                        et.guid = breeze.core.getUuid(); // to see distinct entity types while debugging
                        store.addEntityType(et);
                        store.registerEntityTypeCtor("FooBar", FooBar);
                    };
                    FooBar.typeName = "FooBar";
                    return FooBar;
                })(entities.CodeBase);
                entities.FooBar = FooBar;
            })(domainModel.entities || (domainModel.entities = {}));
            var entities = domainModel.entities;
        })(domainModel || (domainModel = {}));


        var dso = new Object();
        dso.serviceName = testFns.serviceName;
        dso.hasServerMetadata = false;
        var ds = new breeze.DataService(dso);
        var store = new MetadataStore({ namingConvention: breeze.NamingConvention.none });
        var emo = new Object();
        emo.dataService = ds;
        emo.metadataStore = store;
        

        var manager = new breeze.EntityManager(emo);
        // var store = manager.metadataStore;

        if (addFooBar) {
            domainModel.entities.CodeBase.addEntityMetadata(store);
            domainModel.entities.FooBar.addEntityMetadata(store);
            domainModel.entities.TimeGroup.addEntityMetadata(store);
        }
        else {
            domainModel.entities.TimeGroup.addEntityMetadata(store);
        }
        return manager;

    }

    test("external customer metadata", function () {
        if (testFns.DEBUG_ODATA) {
            ok(true, "Skipped tests - not applicable to OData");
            return;
        };

        if (testFns.DEBUG_MONGO) {
            ok(true, "Skipped tests - not applicable to Mongo yet");
            return;
        };

        var em = newAltEm();
        stop();
        em.fetchMetadata().then(function (rawMetadata) {
            var ms = em.metadataStore;
            ets = ms.getEntityTypes();
            ok(ets.length > 0, "should be some entityTypes");
        }).fail(testFns.handleFail).fin(start);
    });

    test("default interface impl", function() {
        var store = new MetadataStore();
        stop();
        store.fetchMetadata(testFns.serviceName).then(function() {
            ok(!store.isEmpty());
        }).fail(testFns.handleFail).fin(start);
    });

    test("getEntityType informative error message1", function () {
        var store = new MetadataStore();
        var em = new EntityManager({ serviceName: testFns.serviceName, metadataStore: store });

        try {
            var customer = em.createEntity("Customer", { customerID: breeze.core.getUuid() });
            ok(false, "Shouldn't get here");
        } catch (err) {
            ok(err.message.indexOf("fetchMetadata") !== -1, "The error message should say to ensure metadata is fetched.");
        }
    });

    test("getEntityType informative error message2", function () {
        var store = new MetadataStore();
        var em = new EntityManager({ serviceName: testFns.serviceName, metadataStore: store });

        try {
            var productType = em.metadataStore.getEntityType("Customer");
            ok(false, "Shouldn't get here");
        } catch (err) {
            ok(err.message.indexOf("fetchMetadata") !== -1, "The error message should say to ensure metadata is fetched.");
        }
    });
    
    test("initialization", function () {

        if (testFns.DEBUG_MONGO) {
            ok(true, "N/A for Mongo - Current impl provides camelCase naming convention on the server");
            return;
        }

        var store = new MetadataStore({ namingConvention: NamingConvention.none } );
        stop();
        var dataServiceAdapter = core.config.getAdapterInstance("dataService");
        var dataService = new breeze.DataService({ serviceName: testFns.serviceName });
        dataServiceAdapter.fetchMetadata(store, dataService).then(function() {
            try {
                var typeMap = store._structuralTypeMap;
                var types = objectValues(typeMap);
                ok(types.length > 0);
                var custType = store.getEntityType("Customer");
                var props = custType.dataProperties;
                ok(props.length > 0);
                var keys = custType.keyProperties;
                ok(keys.length > 0);
                var prop = custType.getProperty("CompanyName");
                ok(prop, "fails if default naming convention is camelCase and metadata provides nameOnServer");
                ok(prop.isDataProperty);
                var navProp = custType.navigationProperties[0];
                ok(navProp.isNavigationProperty);
                var notProp = custType.getProperty("foo");
                ok(!notProp);
                
                
            } catch(e) {
                ok(false, "shouldn't fail except if using server side json metadata file.");
            }
        }).fail(testFns.handleFail).fin(start);
    });

    test("initialize only once", function() {
        var store = new MetadataStore();
        var em = new EntityManager({ serviceName: testFns.serviceName, metadataStore: store });
        stop();
        store.fetchMetadata(testFns.serviceName).then(function () {
            ok(!store.isEmpty());
            ok(store.hasMetadataFor(testFns.serviceName));
            ok(em.metadataStore.hasMetadataFor(em.serviceName), "manager serviceName is not the same as the metadataStore name");

        }).fail(testFns.handleFail).fin(start);
    });

    test("initialization concurrent", 2, function () {

        var store = new MetadataStore();
        var sc = new testFns.StopCount(2);
        var typeMap;
        var errFn = function (e) {
            ok(false, e);
        };
        var dataServiceAdapter = core.config.getAdapterInstance("dataService");
        var dataService = new breeze.DataService({ serviceName: testFns.serviceName });
        
        var p1 = dataServiceAdapter.fetchMetadata(store, dataService).then(function () {
            typeMap = store._structuralTypeMap;
            ok(true, "should get here");

        });
        var p2 = dataServiceAdapter.fetchMetadata(store, dataService).then(function () {
            typeMap = store._structuralTypeMap;
            ok(true, "should also get here");
            
        });
        Q.all([p1, p2]).fail(errFn).fin(start);
    });


    function importMetadataWithInheritance (metadataJson) {
        var store = new MetadataStore({ namingConvention: breeze.NamingConvention.none });
        store.importMetadata(metadataJson);
        var em = new EntityManager({ metadataStore: store });
        var apple = em.createEntity("Apple", { Variety: "Jonathan", Name: "Apple", Id: 23 });
        ok(apple.entityAspect.entityState === breeze.EntityState.Added);
        ok(apple.getProperty("Variety") === "Jonathan");
        ok(apple.getProperty("Name") === "Apple");
        ok(apple.getProperty("Id") === 23);

        var iopType = store.getEntityType("ItemOfProduce");
        var customTypeInfo = iopType.custom;
        
        checkCustomType(iopType);
        checkCustomProp(iopType, "Id");
    }

    test("importMetadata - metadataItemFruitApple", function () {
        importMetadataWithInheritance(metadataItemFruitApple)
    });
    test("importMetadata - metadataAppleFruitItem", function () {
        importMetadataWithInheritance(metadataAppleFruitItem)
    });
    test("importMetadata - metadataFruitAppleItem", function () {
        importMetadataWithInheritance(metadataFruitAppleItem)
    });

    function makeCustomTypeAnnot(typeName) {
        return {
            "foo": 7,
            "bar": typeName,
            "fooBar": {
                "x": 8,
                "y": 9,
                "z": true
            }
        };
    }

    function makeCustomPropAnnot(propName) {
        return  {
            "fooDp": 7,
            "barDp": propName,
            "fooBarDp": {
                "x": 8,
                "y": 9,
                "z": true
            }
        };
    }

    function checkCustomType(stype) {
        ok(stype.custom, "stype.custom should exist");
        ok(stype.custom.foo === 7, "stype.custom.foo should === 7");
        ok(stype.custom.bar === stype.shortName, "stype.custom.bar should === stype.shortName");
        ok(stype.custom.fooBar.x === 8, "stype.custom.fooBar.x should === 8");
        ok(stype.custom.fooBar.z === true, "stype.custom.fooBar.z should === true");
    }

    function checkCustomProp(stype, name) {
        var prop = stype.getProperty(name);
        ok(prop.custom, "prop.custom should exist");
        ok(prop.custom.fooDp === 7, "prop.custom.fooDp should === 7");
        ok(prop.custom.barDp === name, "prop.custom.barDp should be the same as the property name");
        ok(prop.custom.fooBarDp.x === 8, "prop.custom.fooBarDp.x should === 8");
        ok(prop.custom.fooBarDp.z === true, "prop.custom.fooBarDp.z should === true");
    }

    function objectValues(obj, deep) {
        deep = deep || false;
        var result = [];
        for (var name in obj) {
            if (deep || obj.hasOwnProperty(name)) {
                result.push(obj[name]);
            }
        }
        return result;
    }


    var appleType = {
        "shortName": "Apple",
        "namespace": "Models.Produce",
        "baseTypeName": "Fruit:#Models.Produce",
        "autoGeneratedKeyType": "None",
        "defaultResourceName": "Apples",
        "dataProperties": [
          {
              "nameOnServer": "Variety",
              "dataType": "String",
              "isNullable": true,
              "maxLength": 50,
              "validators": [
                {
                    "maxLength": "50",
                    "name": "maxLength"
                }
              ]
          }
        ],
        "navigationProperties": []
    };

    var fruitType = {
        "shortName": "Fruit",
        "namespace": "Models.Produce",
        "baseTypeName": "ItemOfProduce:#Models.Produce",
        "autoGeneratedKeyType": "None",
        "defaultResourceName": "Fruits",
        "dataProperties": [
          {
              "nameOnServer": "Name",
              "dataType": "String",
              "isNullable": false,
              "maxLength": 50,
              "validators": [
                {
                    "name": "required"
                },
                {
                    "maxLength": "50",
                    "name": "maxLength"
                }
              ]
          }
        ],
        "navigationProperties": []
    };
    var itemOfProduceType = {
        "shortName": "ItemOfProduce",
        "namespace": "Models.Produce",
        "autoGeneratedKeyType": "None",
        "defaultResourceName": "ItemsOfProduce",
        "dataProperties": [
          {
              "nameOnServer": "Id",
              "dataType": "Int32",
              "isNullable": false,
              "isPartOfKey": true,
              "validators": [
                {
                    "name": "required"
                },
                {
                    "name": "int32"
                }
              ],
              "custom": makeCustomPropAnnot("Id")
          } ],
        "navigationProperties": [],
        "custom": makeCustomTypeAnnot("ItemOfProduce")
    };
    var resourceEntityTypeMap = {
        "Apples": "Apple:#Models.Produce",
        "Fruits": "Fruit:#Models.Produce",
        "ItemsOfProduce": "ItemOfProduce:#Models.Produce"
    };


    var metadataItemFruitApple = {
        "localQueryComparisonOptions": "caseInsensitiveSQL",
        "structuralTypes": [itemOfProduceType, fruitType, appleType],
        "resourceEntityTypeMap": resourceEntityTypeMap
    };
    var metadataAppleFruitItem = {
        "localQueryComparisonOptions": "caseInsensitiveSQL",
        "structuralTypes": [ appleType, fruitType, itemOfProduceType ],
        "resourceEntityTypeMap": resourceEntityTypeMap
    };
    var metadataFruitAppleItem = {
        "localQueryComparisonOptions": "caseInsensitiveSQL",
        "structuralTypes": [fruitType, appleType, itemOfProduceType],
        "resourceEntityTypeMap": resourceEntityTypeMap
    };


    makeCustomMetadata = function(namespace) {
        return {
            "structuralTypes": [{
                "shortName": "Customer",
                "namespace": namespace,
                "dataProperties": [ { 
                    "nameOnServer": "CustomerID",
                    "custom": makeCustomPropAnnot("customerID")
                }, {
                    "name": "companyName",
                    "custom": makeCustomPropAnnot("companyName")
                } ],
                "navigationProperties": [  {
                    "name": "orders",
                    "custom": makeCustomPropAnnot("orders")
                } ],
                "custom": makeCustomTypeAnnot("Customer")
            }]
        };
    };

})(breezeTestFns);