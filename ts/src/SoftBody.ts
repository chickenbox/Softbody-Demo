namespace hahaApp {
    const epsilon = 0.0001
    const v = new THREE.Vector3
    const v2 = new THREE.Vector3
    const v3 = new THREE.Vector3

    function toKey( v: THREE.Vector3 ) {
        return `${Math.round(v.x/epsilon)},${Math.round(v.y/epsilon)},${Math.round(v.z/epsilon)}`
    }

    function processGeometry( bufGeo: THREE.BufferGeometry ){
        const indexLookup = new Map<string,number>()
        const index: number[] = []
        const convexPos: THREE.Vector3[] = []
        const convexHull = new (THREE as any).ConvexHull()
        convexHull.setFromObject( new THREE.Mesh(bufGeo))
        const faces = convexHull.faces
        for ( let i = 0; i < faces.length; i ++ ) {

            const face = faces[ i ]
            let edge = face.edge

            // we move along a doubly-connected edge list to access all face points (see HalfEdge docs)

            do {

                const point = edge.head().point
                const key = toKey(point)
                let idx: number
                if( indexLookup.has(key) ){
                    idx = indexLookup.get(key)
                }else{
                    idx = convexPos.length
                    convexPos.push(point)
                    indexLookup.set(key, idx)
                }
                index.push(idx)

                edge = edge.next

            } while ( edge !== face.edge )

        }

        const position = bufGeo.attributes.position as THREE.BufferAttribute
        const normal = bufGeo.attributes.normal as THREE.BufferAttribute

        const mapping = new Array<{
            initial: {
                position: THREE.Vector3
                normal: THREE.Vector3
            }
            weights: {
                index: number
                weight: number
            }[]
        }>(position.count)
        for( let i=0; i<position.count; i++ ){
            const weights = new Array<{
                index: number
                weight: number
            }>( convexPos.length )

            const v = new THREE.Vector3().fromBufferAttribute( position, i )
            for( let j=0; j<convexPos.length; j++ ){
                weights[j] = {
                    index: j,
                    weight: v.distanceTo(convexPos[j])
                }
            }

            weights.sort((a,b)=>a.weight-b.weight)
            if( weights[0].weight<=epsilon ){
                weights.length = 1
                weights[0].weight = 1
            }else{
                if( weights.length>4 )
                    weights.length = 4
                let totalWeight = 0
                weights.forEach(w=>{
                    w.weight = 1/w.weight
                    totalWeight += w.weight
                })
                weights.forEach(w=>w.weight/=totalWeight)
            }

            mapping[i] = {
                initial: {
                    position: v,
                    normal: new THREE.Vector3().fromBufferAttribute(normal, i)
                },
                weights: weights
            }
        }

        const convexPosArray = new Array<number>(convexPos.length*3)
        for( let i=0; i<convexPos.length; i++ ){
            convexPos[i].toArray(convexPosArray, i*3)
        }
        
        return {
            position: convexPosArray,
            index: index,
            mapping: mapping
        }

    }

    export class SoftBody {

        readonly mesh: THREE.Mesh
        readonly softbody: Ammo.btSoftBody
        readonly geometry: THREE.BufferGeometry
        private states: {
            initial: {
                position: THREE.Vector3
                normal: THREE.Vector3
            },
            translate: THREE.Vector3
            quaternion: THREE.Quaternion
        }[] = []
        private mapping:{
            initial: {
                position: THREE.Vector3
                normal: THREE.Vector3
            }
            weights: {
                index: number
                weight: number
            }[]
        }[]
        soundCooldown = 1

        constructor(
            worldInfo: Ammo.btSoftBodyWorldInfo,
            geometry: THREE.BufferGeometry,
            material: THREE.Material
        ){
            this.geometry = geometry
            const info = processGeometry(geometry)

            const helper = new Ammo.btSoftBodyHelpers()

            this.softbody = helper.CreateFromTriMesh(
                worldInfo,
                info.position,
                info.index,
                info.index.length/3,
                true
            )
            this.softbody.m_cfg.kPR = 2
            this.softbody.m_cfg.viterations = 5
            this.softbody.m_cfg.piterations = 5
            this.softbody.setTotalMass(0.1,true)
            this.softbody.getCollisionShape().setMargin(0.05)
            this.setInitialStates()

            this.mapping = info.mapping

            Ammo.destroy(helper)

            this.mesh = new THREE.Mesh(geometry, material)            
        }

        protected onDeform( app: App, deform: number, position: THREE.Vector3 ){
            if( deform > 0.2 ){
                if( this.soundCooldown<=0 ){
                    app.audio.playSoundByIndex(this.softbody.getUserIndex())
                    this.soundCooldown = 0.5
                }
            }
        }

        private setInitialStates(){
            this.states.length = this.softbody.m_nodes.size()
            for( let i=0; i<this.softbody.m_nodes.size(); i++ ){
                const node = this.softbody.m_nodes.at(i)
                const x = node.m_x
                const n = node.m_n
                this.states[i] = {
                    initial:{
                        position: new THREE.Vector3(x.x(),x.y(),x.z()),
                        normal: new THREE.Vector3(n.x(),n.y(),n.z()),
                    },
                    translate: new THREE.Vector3(0,0,0),
                    quaternion: new THREE.Quaternion(0,0,0,1)
                }
            }
        }

        private updateStates(){
            for( let i=0; i<this.softbody.m_nodes.size(); i++ ){

                const node = this.softbody.m_nodes.at(i)
                const x = node.m_x
                const n = node.m_n

                const state = this.states[i]
                state.translate.subVectors( v.set(x.x(), x.y(), x.z()), state.initial.position )
                state.quaternion.setFromUnitVectors( state.initial.normal, v.set(n.x(), n.y(), n.z()) )
            }
        }

        update(app: App, deltaTime: number){
            this.soundCooldown -= deltaTime

            this.updateStates()

            const position = this.geometry.attributes.position as THREE.BufferAttribute
            const normal = this.geometry.attributes.normal as THREE.BufferAttribute
            const n = position.count
            let deform = 0
            let totalDeform = 0
            v3.set(0,0,0)
            for( let i=0; i<n; i++ ){
                const m = this.mapping[i]
                const w = m.weights
                let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0
                for( let j=0; j<w.length; j++ ){
                    const ww = w[j]
                    const state = this.states[ww.index]
                    
                    v.copy(m.initial.position).add( state.translate ).multiplyScalar(ww.weight)
                    px += v.x
                    py += v.y
                    pz += v.z

                    v.copy(m.initial.normal).applyQuaternion(state.quaternion).multiplyScalar(ww.weight)
                    nx += v.x
                    ny += v.y
                    nz += v.z
                }
                v.fromBufferAttribute(position, i)
                v2.set(px, py, pz)
                const d = v.distanceTo(v2)
                deform = Math.max(deform,d)
                totalDeform += d
                v3.addScaledVector(v2, d)

                v2.toArray(position.array, i*3)
                v.set(nx,ny,nz).normalize()
                normal.setXYZ(i, v.x, v.y, v.z)
            }
            v3.divideScalar(totalDeform)
            position.needsUpdate = true
            normal.needsUpdate = true

            this.onDeform(app, deform, v3)
        }

    }

}