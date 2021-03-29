namespace hahaApp {
    const epsilon = 0.0001
    const v = new THREE.Vector3
    const v2 = new THREE.Vector3
    const v3 = new THREE.Vector3

    function toKey( v: THREE.Vector3 ) {
        return `${Math.round(v.x/epsilon)},${Math.round(v.y/epsilon)},${Math.round(v.z/epsilon)}`
    }

    function processGeometry( bufGeo: THREE.BufferGeometry ){
        const position = bufGeo.attributes.position as THREE.BufferAttribute
        const points = new Array<THREE.Vector3>(position.count)
        for( let i=0; i<position.count; i++ ){
            points[i] = new THREE.Vector3().fromBufferAttribute(position,i)
        }

        let convexHull = (THREE.BufferGeometryUtils as any).mergeVertices( new (THREE as any).ConvexGeometry(points), epsilon ) as THREE.BufferGeometry
        const convexPos = convexHull.attributes.position as THREE.BufferAttribute

        const mapping = new Array<{
            index: number
            weight: number
        }[]>(position.count)
        for( let i=0; i<position.count; i++ ){
            const weights = new Array<{
                index: number
                weight: number
            }>( convexPos.count )

            v.fromBufferAttribute( position, i )
            for( let j=0; j<convexPos.count; j++ ){
                v2.fromBufferAttribute(convexPos, j)
                weights[j] = {
                    index: j,
                    weight: v.distanceTo(v2)
                }
            }

            weights.sort((a,b)=>a.weight-b.weight)
            if( weights[0].weight==0 ){
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

            mapping[i] = weights
        }
        
        return {
            position: Array.from( convexPos.array ),
            index: Array.from(convexHull.index.array),
            mapping: mapping
        }

    }

    export class SoftBody {

        readonly mesh: THREE.Mesh
        readonly softbody: Ammo.btSoftBody
        readonly geometry: THREE.BufferGeometry
        private mapping: {
            index: number
            weight: number
        }[][]
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
            this.softbody.m_cfg.kPR = 5
            this.softbody.m_cfg.viterations = 10
            this.softbody.m_cfg.piterations = 10
            this.softbody.setTotalMass(0.1,true)
            this.softbody.getCollisionShape().setMargin(0.05)

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

        update(app: App, deltaTime: number){
            this.soundCooldown -= deltaTime

            const position = this.geometry.attributes.position as THREE.BufferAttribute
            const normal = this.geometry.attributes.normal as THREE.BufferAttribute
            const n = position.count
            const v = new THREE.Vector3
            const v2 = new THREE.Vector3
            let deform = 0
            let totalDeform = 0
            v3.set(0,0,0)
            for( let i=0; i<n; i++ ){
                const w = this.mapping[i]
                let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0
                for( let j=0; j<w.length; j++ ){
                    const ww = w[j]
                    const n = this.softbody.m_nodes.at(ww.index)
                    const m_x = n.m_x
                    const m_n = n.m_n

                    px += m_x.x()*ww.weight
                    py += m_x.y()*ww.weight
                    pz += m_x.z()*ww.weight

                    nx += m_n.x()*ww.weight
                    ny += m_n.y()*ww.weight
                    nz += m_n.z()*ww.weight

                }
                v.fromBufferAttribute(position, i)
                v2.set(px, py, pz)
                const d = v.distanceTo(v2)
                deform = Math.max(deform,d)
                totalDeform += d
                v3.addScaledVector(v2, d)

                v2.toArray(position.array, i*3)
                normal.setXYZ(i, nx, ny, nz)
            }
            v3.divideScalar(totalDeform)
            position.needsUpdate = true
            normal.needsUpdate = true

            this.onDeform(app, deform, v3)
        }

    }

}