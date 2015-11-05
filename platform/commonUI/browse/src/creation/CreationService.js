/*****************************************************************************
 * Open MCT Web, Copyright (c) 2014-2015, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT Web is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT Web includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/
/*global define,Promise*/

/**
 * Module defining CreateService. Created by vwoeltje on 11/10/14.
 */
define(
    ["uuid"],
    function (uuid) {
        "use strict";

        var NON_PERSISTENT_WARNING =
                "Tried to create an object in non-persistent container.",
            NO_COMPOSITION_WARNING =
                "Could not add to composition; no composition in ";

        /**
         * The creation service is responsible for instantiating and
         * persisting new domain objects. Handles all actual object
         * mutation and persistence associated with domain object
         * creation.
         * @memberof platform/commonUI/browse
         * @constructor
         */
        function CreationService($q, $log) {
            this.$q = $q;
            this.$log = $log;
        }

        /**
         * Create a new domain object with the provided model, as
         * a member of the provided parent domain object's composition.
         * This parent will additionally determine which persistence
         * space an object is created within (as it is possible to
         * have multiple persistence spaces attached.)
         *
         * Note that the model passed in for object creation may be
         * modified to attach additional initial properties associated
         * with domain object creation.
         *
         * @param {object} model the model for the newly-created
         *        domain object
         * @param {DomainObject} parent the domain object which
         *        should contain the newly-created domain object
         *        in its composition
         * @return {Promise} a promise that will resolve when the domain
         *         object has been created
         */
        CreationService.prototype.createObject = function (model, parent) {
            var persistence = parent.getCapability("persistence"),
                newObject = parent.useCapability("creation", model),
                newObjectPersistence = newObject.getCapability("persistence"),
                self = this;

            // Add the newly-created object's id to the parent's
            // composition, so that it will subsequently appear
            // as a child contained by that parent.
            function addToComposition(id, parent, parentPersistence) {
                var compositionCapability = parent.getCapability('composition'),
                    addResult = compositionCapability &&
                        compositionCapability.add(id);

                return self.$q.when(addResult).then(function (result) {
                    if (!result) {
                        self.$log.error("Could not modify " + parent.getId());
                        return undefined;
                    }

                    return parentPersistence.persist().then(function () {
                        return result;
                    });
                });
            }

            // We need the parent's persistence capability to determine
            // what space to create the new object's model in.
            if (!persistence || !newObjectPersistence) {
                self.$log.warn(NON_PERSISTENT_WARNING);
                return self.$q.reject(new Error(NON_PERSISTENT_WARNING));
            }

            // We create a new domain object in three sequential steps:
            // 1. Get a new UUID for the object
            // 2. Create a model with that ID in the persistence space
            // 3. Add that ID to
            return newObjectPersistence.persist().then(function () {
                var id = newObject.getId();
                return addToComposition(id, parent, persistence);
            });
        };



        return CreationService;
    }
);

