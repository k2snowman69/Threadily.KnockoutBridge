/**
 * This class is responsible for linking threadily observables to knockout observables.
 * As they both work on subscription systems, it's a very one-to-one process.
 */
export class ThreadilyKnockoutBridge
{
    /**
     * Links a Threadily Observable object to a KnockoutObservable object so that whenever the threadily object is updated, the knockout object is updated
     * @param threadilyModule The loaded module of which contains not just Threadily but the ViewModel of the application
     * @param koModule The knockout module
     * @param self The object to create the knockout properties on
     * @param threadilyProperty The threadily property to be subscribed to
     * @param threadilyTypeName The type of the threadily property to be subscribed to
     * @param koObjectName The name that the knockout observable will be called
     * @param koViewModel Optional: The constructor to be called when the value is set to a new object. Should only needed for complex types.
     * @param decorator Optional: Function to run anytime a new value comes in
     * @return A knockout subscription
     */
    public static initAndLinkKnockoutObservableToThreadilyObject(threadilyModule: any, koModule: any, self: any, threadilyProperty: any, threadilyTypeName: string, koObjectName: string, koViewModel: (threadilyModule: any, koModule: any, viewModel: any) => void, decorator: (newValue: any) => any)
    {
        var requiredArguments = ["threadilyModule", "koModule", "self", "threadilyProperty", "threadilyTypeName", "koObjectName"];
        for (var i = 0; i < requiredArguments.length; i++) {
            if (arguments[i] == null) {
                throw new Error(requiredArguments[i] + " cannot be null");
            }
        }

        if (decorator == null) {
            decorator = (originalValue) => {
                return originalValue;
            };
        }
        // create the observable object on the self object
        if (threadilyProperty.get() == null) {
            self[koObjectName] = koModule.observable(null);
        }
        else {
            // only if it is a ThreadObject, store a reference so we can make service calls on it
            var data = threadilyProperty.get();
            if (threadilyProperty.getThreadId != null) {
                data = threadilyProperty.clone();
                self[koObjectName + "ThreadObject"] = data;
            }
            if (koViewModel != null) {
                self[koObjectName] = koModule.observable(new koViewModel(threadilyModule, koModule, decorator(data)));
            }
            else {
                self[koObjectName] = koModule.observable(decorator(data));

            }
        }

        // link up for updates
        return threadilyProperty.subscribe(new threadilyModule["ISubscribeHandle" + threadilyTypeName + "Callback"].implement({
            onChange(newValue) {
                // only if it is a ThreadObject, store a reference so we can make service calls on it
                if (newValue.getThreadId != null) {
                    if (self[koObjectName + "ThreadObject"] != null) {
                        self[koObjectName + "ThreadObject"].delete();
                    }
                    if (newValue != null) {
                        newValue = newValue.clone();
                        self[koObjectName + "ThreadObject"] = newValue;
                    }
                }
                // now set the value
                if (koViewModel != null) {
                    self[koObjectName](new koViewModel(threadilyModule, koModule, decorator(newValue)));
                }
                else {
                    self[koObjectName](decorator(newValue));

                }
            }
        }));
    }

    /**
     * Links a Threadily ObservableVector to a KnockoutObservableArray so that whenever the Threadily ObservableVector is updated, the KnockoutObservableArray is updated
     * @param threadilyModule The loaded module of which contains not just Threadily but the ViewModel of the application
     * @param koModule The knockout module
     * @param self The object to create the knockout properties on
     * @param threadilyVector The threadily property to be subscribed to
     * @param threadilyVectorTypeName The type of the threadily property to be subscribed to
     * @param koArrayName The name that the knockout observable will be called
     * @param koViewModel Optional: The constructor to be called when the value is set to a new object. Should only needed for complex types.
     * @return A knockout subscription
     */
    public static initAndLinkKnockoutArrayToThreadilyVector(threadilyModule, koModule, self, threadilyVector, threadilyVectorTypeName, koArrayName, koViewModel) {
        var requiredArguments = ["threadilyModule", "koModule", "self", "threadilyVector", "threadilyVectorTypeName", "koArrayName"];
        for (var i = 0; i < requiredArguments.length; i++) {
            if (arguments[i] == null) {
                throw new Error(requiredArguments[i] + " cannot be null");
            }
        }

        // create the observable array on the self object
        self[koArrayName] = koModule.observableArray([]);
        self[koArrayName + "ThreadObjects"] = [];

        // populate it with the initial data
        var koArray = self[koArrayName];
        for (var i = 0; i < threadilyVector.size(); i++) {
            var iObject = threadilyVector.at(i);
            // only if it is a ThreadObject, store a reference so we can make service calls on it
            if (iObject.getThreadId != null) {
                iObject = iObject.clone();
                self[koArrayName + "ThreadObjects"].push(iObject);
            }
            if (koViewModel != null) {
                koArray.push(new koViewModel(threadilyModule, koModule, iObject));
            }
            else {
                koArray.push(iObject);
            }
        }

        // subscribe to events
        return threadilyVector.subscribe(new threadilyModule["ISubscribeHandle" + threadilyVectorTypeName + "VectorCallback"].implement({
            onChange(value, index, action) {
                if (value != null && value.getThreadId != null) {
                    value = value.clone();
                }

                if (action == threadilyModule.ObservableActionType.Insert) {
                    // only if it is a ThreadObject, store a reference so we can make service calls on it
                    if (value.getThreadId != null) {
                        self[koArrayName + "ThreadObjects"].splice(index, 0, value);
                    }
                    if (koViewModel != null) {
                        koArray.splice(index, 0, new koViewModel(threadilyModule, koModule, value));
                    }
                    else {
                        koArray.splice(index, 0, value);
                    }
                }
                else if (action == threadilyModule.ObservableActionType.Erase) {
                    if (value.getThreadId != null) {
                        var removed = self[koArrayName + "ThreadObjects"][index];
                        self[koArrayName + "ThreadObjects"].splice(index, 1);
                        removed.delete();
                    }
                    koArray.splice(index, 1);
                }
                else {
                    throw new Error('Not implemented');
                }
            }
        }));
    }
}